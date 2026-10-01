/**
 * Auto-provisioning de custom properties HubSpot (af_origen + af_metadata_extra).
 *
 * Idempotente: lee las properties existentes en `/crm/v3/properties/contacts`
 * y sólo POSTea las que faltan. Llamado por `HubSpotCRMProvider.init()` tras
 * un OAuth callback exitoso.
 *
 * Ref:
 *   plans/260524-1330-sprint-2-adapter-hubspot-zoho/research/researcher-01-hubspot.md §5
 */

export interface CustomPropertyDef {
  name: string;
  label: string;
  fieldType: "text" | "textarea";
  description: string;
  groupName?: string;
}

export const REQUIRED_CUSTOM_PROPERTIES: CustomPropertyDef[] = [
  {
    name: "af_origen",
    label: "AF Origen",
    fieldType: "text",
    description: "Canal de adquisición original del lead (LinkStation).",
    groupName: "contactinformation",
  },
  {
    name: "af_metadata_extra",
    label: "AF Metadata Extra",
    fieldType: "textarea",
    description: "JSON con metadata adicional del lead (LinkStation).",
    groupName: "contactinformation",
  },
];

/**
 * Asegura que las custom properties existan en el portal HubSpot del tenant.
 * Llamado por `HubSpotCRMProvider.init()` o `ensureCustomProperties()`.
 *
 * @param fetcher función que hace el request autenticado (la inyecta el provider
 *   para reusar su `request()` privado con manejo de retries + 401).
 */
export async function ensureCustomProperties(
  fetcher: (path: string, options?: RequestInit) => Promise<unknown>,
  defs: CustomPropertyDef[] = REQUIRED_CUSTOM_PROPERTIES
): Promise<{ created: string[]; existing: string[] }> {
  const existingRes = (await fetcher("/crm/v3/properties/contacts")) as {
    results?: Array<{ name?: string }>;
  };
  const existingSet = new Set(
    (existingRes?.results ?? []).map((p) => p.name).filter(Boolean) as string[]
  );

  const created: string[] = [];
  const existing: string[] = [];

  for (const def of defs) {
    if (existingSet.has(def.name)) {
      existing.push(def.name);
      continue;
    }
    await fetcher("/crm/v3/properties/contacts", {
      method: "POST",
      body: JSON.stringify({
        name: def.name,
        label: def.label,
        type: "string",
        fieldType: def.fieldType,
        description: def.description,
        groupName: def.groupName ?? "contactinformation",
      }),
    });
    created.push(def.name);
  }

  return { created, existing };
}
