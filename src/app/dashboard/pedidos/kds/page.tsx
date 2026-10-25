"use client";

import React from "react";
import { KDSView } from "@/components/pedidos/KDSView";
import { useTenantStore } from "@/store/tenant";

export default function KDSPage() {
  const { tenantId, tenantName } = useTenantStore();

  return (
    <KDSView
      tenantId={tenantId || "default-tenant"}
      tenantName={tenantName || "Restaurante"}
    />
  );
}
