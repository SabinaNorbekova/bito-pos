import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "BITO POS API",
      version: "1.0.0",
      description:
        "Multi-tenant POS backend. Auth uses a JWT carrying { userId, tenantId, role }. " +
        "Tenant is NEVER accepted from the client after login - it always comes from the token.",
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
});
