import { Prisma } from "@prisma/client";

const AUDITED_MODELS = ["Device", "DeployHistory"];
const AUDITED_ACTIONS = ["create", "update", "delete"];

const TABLE_MAP: Record<string, string> = {
  Device: "tb_device",
  DeployHistory: "tb_deploy_history",
};

/**
 * Prisma middleware for automatic audit logging.
 * Records all CREATE, UPDATE, DELETE operations on audited models.
 */
export function auditMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    if (
      !params.model ||
      !AUDITED_MODELS.includes(params.model) ||
      !AUDITED_ACTIONS.includes(params.action)
    ) {
      return next(params);
    }

    const model = params.model;
    const action = params.action.toUpperCase();

    // Capture old values for update/delete
    let oldValues: Record<string, unknown> | null = null;
    if (
      (params.action === "update" || params.action === "delete") &&
      params.args?.where
    ) {
      try {
        const { prisma } = await import("@/lib/prisma");
        const delegate = (prisma as unknown as Record<string, unknown>)[
          model.charAt(0).toLowerCase() + model.slice(1)
        ] as { findUnique?: (args: { where: unknown }) => Promise<unknown> } | undefined;

        if (delegate?.findUnique) {
          oldValues = (await delegate.findUnique({
            where: params.args.where,
          })) as Record<string, unknown> | null;
        }
      } catch {
        // If we can't get old values, continue without them
      }
    }

    // Execute the original operation
    const result = await next(params);

    // Write audit log (non-blocking to main operation)
    try {
      const { prisma } = await import("@/lib/prisma");
      const recordId =
        (result as { id?: number })?.id ||
        params.args?.where?.id ||
        0;

      await prisma.auditLog.create({
        data: {
          action,
          tableName: TABLE_MAP[model] || model,
          recordId: typeof recordId === "number" ? recordId : parseInt(String(recordId)),
          oldValues: oldValues ? (oldValues as Prisma.JsonObject) : Prisma.JsonNull,
          newValues:
            params.action === "delete"
              ? Prisma.JsonNull
              : (result as Prisma.JsonObject) || Prisma.JsonNull,
        },
      });
    } catch {
      console.error("[Audit] Failed to write audit log");
    }

    return result;
  };
}
