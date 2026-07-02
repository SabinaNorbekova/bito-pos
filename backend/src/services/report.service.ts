import { Types, PipelineStage } from "mongoose";
import { Order } from "../models/order.model";
import { cacheGet, cacheSet, reportCacheKey } from "./cache.service";
import { env } from "../config/env";

export interface SalesReport {
  from: string;
  to: string;
  totalRevenue: number;
  totalMargin: number;
  orderCount: number;
  topProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    margin: number;
  }>;
}

export async function getSalesReport(
  tenantId: string,
  from: Date,
  to: Date
): Promise<SalesReport> {
  const cacheKey = reportCacheKey(
    tenantId,
    from.toISOString(),
    to.toISOString()
  );
  const cached = cacheGet<SalesReport>(cacheKey);
  if (cached) return cached;

  const pipeline: PipelineStage[] = [
    {
      $match: {
        tenantId: new Types.ObjectId(tenantId),
        status: "paid",
        createdAt: { $gte: from, $lt: to },
      },
    },
    { $unwind: "$items" },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$items.lineTotal" },
              totalMargin: {
                $sum: {
                  $multiply: [
                    {
                      $subtract: [
                        "$items.priceAtSale",
                        "$items.costPriceAtSale",
                      ],
                    },
                    "$items.qty",
                  ],
                },
              },
              orderIds: { $addToSet: "$_id" },
            },
          },
        ],
        byProduct: [
          {
            $group: {
              _id: "$items.productId",
              name: { $first: "$items.name" },
              sku: { $first: "$items.sku" },
              quantitySold: { $sum: "$items.qty" },
              revenue: { $sum: "$items.lineTotal" },
              margin: {
                $sum: {
                  $multiply: [
                    {
                      $subtract: [
                        "$items.priceAtSale",
                        "$items.costPriceAtSale",
                      ],
                    },
                    "$items.qty",
                  ],
                },
              },
            },
          },
          { $sort: { quantitySold: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ];

  const [result] = await Order.aggregate(pipeline);
  const totals = result?.totals?.[0];

  const report: SalesReport = {
    from: from.toISOString(),
    to: to.toISOString(),
    totalRevenue: totals?.totalRevenue ?? 0,
    totalMargin: totals?.totalMargin ?? 0,
    orderCount: totals?.orderIds?.length ?? 0,
    topProducts: (result?.byProduct ?? []).map(
      (p: {
        _id: Types.ObjectId;
        name: string;
        sku: string;
        quantitySold: number;
        revenue: number;
        margin: number;
      }) => ({
        productId: p._id.toString(),
        name: p.name,
        sku: p.sku,
        quantitySold: p.quantitySold,
        revenue: p.revenue,
        margin: p.margin,
      })
    ),
  };

  cacheSet(cacheKey, report, env.reportCacheTtlMs);
  return report;
}
