// src/pages/products/index.js
import { useEffect, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";

// @mui
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import { styled } from "@mui/material/styles";

// MD2
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDSelect from "components/MDSelect";
import MDButton from "components/MDButton";
import MDBadge from "components/MDBadge";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";

// API
import { listProducts, createProduct, updateProduct, removeProduct } from "api/products";
import { useAuth } from "auth/AuthProvider";

// ---- tiny helpers ----
function useQuery() {
  const { search } = window.location;
  return new URLSearchParams(search);
}

const NodeBox = styled("div")(({ theme }) => ({
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

function NodeRow({ node, isRoot, onChange, onAddChild, onRemove }) {
  return (
    <NodeBox>
      <MDBox
        display="grid"
        gridTemplateColumns={{ xs: "1fr", md: isRoot ? "220px 1fr auto" : "220px 1fr 120px auto" }}
        gap={1}
        alignItems="center"
      >
        <MDInput
          label={isRoot ? "Root SKU" : "Child SKU"}
          value={node.sku}
          onChange={(e) => onChange({ ...node, sku: e.target.value })}
          size="small"
          required
        />
        <MDInput
          label="Name (optional)"
          value={node.name || ""}
          onChange={(e) => onChange({ ...node, name: e.target.value })}
          size="small"
        />
        {!isRoot && (
          <MDInput
            label="Qty"
            type="number"
            inputProps={{ min: 0.0001, step: 1 }}
            value={node.quantity ?? 1}
            onChange={(e) => onChange({ ...node, quantity: e.target.value })}
            size="small"
          />
        )}
        <MDBox display="flex" gap={1} justifyContent="flex-end">
          <MDButton variant="outlined" color="info" size="small" onClick={() => onAddChild(node.id)}>
            <Icon sx={{ mr: 0.5 }}>add</Icon> Child
          </MDButton>
          {!isRoot && (
            <MDButton variant="outlined" color="error" size="small" onClick={() => onRemove(node.id)}>
              <Icon sx={{ mr: 0.5 }}>delete</Icon> Remove
            </MDButton>
          )}
        </MDBox>
      </MDBox>
    </NodeBox>
  );
}

function renderTree({ node, isRoot, onChange, onAddChild, onRemove }) {
  return (
    <MDBox key={node.id} ml={isRoot ? 0 : 3}>
      <NodeRow node={node} isRoot={isRoot} onChange={onChange} onAddChild={onAddChild} onRemove={onRemove} />
      {node.children?.map((c) =>
        renderTree({ node: c, isRoot: false, onChange, onAddChild, onRemove })
      )}
    </MDBox>
  );
}

export default function ProductsPage() {
  const { perms } = useAuth();
  const canWrite = !!perms?.includes("product.write");

  const query = useQuery();
  const initialTab = query.get("tab") === "builder" ? 1 : 0;
  const [tab, setTab] = useState(initialTab);

  // ------- CATALOG -------
  const [rowsRaw, setRowsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("standard"); // optional; backend infers from components
  const [components, setComponents] = useState([{ sku: "", quantity: 1 }]);

  // ------- BUILDER -------
  const [builderErr, setBuilderErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoCreateLeaves, setAutoCreateLeaves] = useState(true);
  const [root, setRoot] = useState({ id: uuid(), sku: "", name: "", children: [] });

  // map of existing catalog for quick id lookup
  const skuMap = useMemo(() => {
    const m = new Map();
    for (const p of rowsRaw) m.set(p.sku, p.id);
    return m;
  }, [rowsRaw]);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      // const data = await listProducts();
      const data = await listProducts({ root_only: 1 });
      setRowsRaw(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  // Pre-fill builder root via ?root=SKU
  useEffect(() => {
    const prefill = (query.get("root") || "").trim();
    if (prefill) {
      setTab(1);
      setRoot((r) => ({ ...r, sku: prefill, name: r.name || prefill }));
    }
    // eslint-disable-next-line
  }, []);

  // Reset components when switching to standard
  useEffect(() => {
    if (type === "standard") setComponents([{ sku: "", quantity: 1 }]);
  }, [type]);

  // Catalog helpers
  function addCompRow() {
    setComponents((p) => [...p, { sku: "", quantity: 1 }]);
  }
  function removeCompRow(idx) {
    setComponents((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));
  }
  function changeComp(idx, key, val) {
    setComponents((p) => p.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));
  }

  // Catalog create
  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    try {
      const payload = { sku, name };
      // type optional: if you explicitly select composite we'll send it;
      // otherwise backend infers composite if components present.
      if (type) payload.type = type;

      if (type === "composite") {
        const cleaned = components
          .map((r) => ({ sku: (r.sku || "").trim(), quantity: Number(r.quantity) || 1 }))
          .filter((r) => r.sku.length > 0);
        if (cleaned.length === 0) {
          setErr("Add at least one component SKU for a composite product.");
          return;
        }
        payload.components = cleaned;
      }

      await createProduct(payload);
      setSku("");
      setName("");
      setType("standard");
      setComponents([{ sku: "", quantity: 1 }]);
      refresh();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to create product.");
    }
  }

  // Catalog inline edits
  async function onChangeType(id, newType) {
    try {
      await updateProduct(id, { type: newType });
      setRowsRaw((prev) => prev.map((p) => (p.id === id ? { ...p, type: newType } : p)));
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Failed to update type.");
    }
  }
  async function onToggleStatus(id, nextStatus) {
    try {
      await updateProduct(id, { status: nextStatus });
      setRowsRaw((prev) => prev.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)));
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Failed to update status.");
    }
  }
  async function onRemove(id) {
    if (!window.confirm("Delete (archive) this product?")) return;
    try {
      await removeProduct(id);
      setRowsRaw((prev) => prev.filter((p) => p.id !== id));
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Failed to delete product.");
    }
  }

  // Builder mutators
  function updateNode(updated) {
    function walk(n) {
      if (n.id === updated.id) return { ...updated };
      return { ...n, children: (n.children || []).map(walk) };
    }
    setRoot((r) => walk(r));
  }
  function addChild(parentId) {
    const child = { id: uuid(), sku: "", name: "", quantity: 1, children: [] };
    function walk(n) {
      if (n.id === parentId) return { ...n, children: [...(n.children || []), child] };
      return { ...n, children: (n.children || []).map(walk) };
    }
    setRoot((r) => walk(r));
  }
  function removeNode(nodeId) {
    function walk(n) {
      return { ...n, children: (n.children || []).filter((c) => c.id !== nodeId).map(walk) };
    }
    setRoot((r) => (r.id === nodeId ? r : walk(r)));
  }
  function collectEdgesByParent(node) {
    const m = new Map();
    function dfs(n) {
      if (n.children && n.children.length) {
        m.set(
          n.sku.trim(),
          n.children
            .filter((c) => (c.sku || "").trim().length > 0)
            .map((c) => ({ sku: c.sku.trim(), quantity: Number(c.quantity) || 1 }))
        );
        n.children.forEach(dfs);
      }
    }
    dfs(node);
    return m;
  }
  function collectAllNodes(node) {
    const arr = [];
    function dfs(n) {
      arr.push(n);
      (n.children || []).forEach(dfs);
    }
    dfs(node);
    return arr;
  }

  // Builder save (uses localSkuMap to avoid races)
  async function onSaveStructure() {
    setBuilderErr("");
    if (!canWrite) return;

    const rootSku = (root.sku || "").trim();
    if (!rootSku) {
      setBuilderErr("Root SKU is required.");
      return;
    }

    function validate(n) {
      for (const c of n.children || []) {
        if (!(c.sku || "").trim()) {
          setBuilderErr("Every component row must have a SKU.");
          return false;
        }
        if (!validate(c)) return false;
      }
      return true;
    }
    if (!validate(root)) return;

    setSaving(true);
    try {
      const localSkuMap = new Map(skuMap);

      // Ensure root exists as composite
      let rootId = localSkuMap.get(rootSku);
      if (!rootId) {
        const created = await createProduct({ sku: rootSku, name: root.name || rootSku, type: "composite" });
        rootId = created?.id;
        if (rootId) localSkuMap.set(rootSku, rootId);
      } else {
        await updateProduct(rootId, { type: "composite" });
      }

      const edges = collectEdgesByParent(root);
      const allNodes = collectAllNodes(root);

      if (autoCreateLeaves) {
        const parentSkus = new Set([...edges.keys()]);
        for (const n of allNodes) {
          const sku = (n.sku || "").trim();
          if (!sku) continue;
          const isParent = parentSkus.has(sku);
          const isLeaf = !isParent;
          const exists = localSkuMap.has(sku);
          if (isLeaf && !exists) {
            const created = await createProduct({ sku, name: n.name || sku, type: "standard" });
            if (created?.id) localSkuMap.set(sku, created.id);
          }
        }
      }

      // For each parent: set composite + direct components
      for (const [parentSku, comps] of edges.entries()) {
        let pid = localSkuMap.get(parentSku);
        if (!pid) {
          const created = await createProduct({ sku: parentSku, name: parentSku, type: "composite" });
          pid = created?.id;
          if (pid) localSkuMap.set(parentSku, pid);
        } else {
          await updateProduct(pid, { type: "composite" });
        }
        await updateProduct(pid, { components: comps, type: "composite" });
      }

      await refresh(); // single refresh at end
      setBuilderErr("");
      alert("Structure saved!");
    } catch (e) {
      setBuilderErr(e?.response?.data?.message || e.message || "Failed to save structure.");
    } finally {
      setSaving(false);
    }
  }

  // DataTable mapping
  const dataTable = useMemo(() => {
    const columns = [
      { Header: "SKU", accessor: "sku", width: "18%", align: "left" },
      { Header: "Name", accessor: "name", width: "28%", align: "left" },
      { Header: "Type", accessor: "type", align: "left" },
      { Header: "Status", accessor: "status", align: "center" },
      { Header: "Components", accessor: "components", align: "left" },
      { Header: "Actions", accessor: "actions", align: "center" },
    ];

    const rows = rowsRaw.map((p) => {
      const statusStr = p.status || "active";
      const typeStr = p.type || "standard";
      const compCount =
        p.components_count ?? p.componentsCount ?? (Array.isArray(p.components) ? p.components.length : undefined);

      return {
        sku: <MDTypography variant="button" fontWeight="medium">{p.sku}</MDTypography>,
        name: <MDTypography variant="button" fontWeight="regular">{p.name}</MDTypography>,
        type: canWrite ? (
          <MDSelect
            select
            value={typeStr}
            onChange={(e) => onChangeType(p.id, e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="standard">Standard</MenuItem>
            <MenuItem value="composite">Composite</MenuItem>
          </MDSelect>
        ) : (
          <MDBadge
            badgeContent={typeStr}
            color={typeStr === "composite" ? "info" : "secondary"}
            variant="gradient"
            size="sm"
          />
        ),
        status: canWrite ? (
          <MDSelect
            select
            value={statusStr}
            onChange={(e) => onToggleStatus(p.id, e.target.value)}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </MDSelect>
        ) : (
          <MDBadge
            badgeContent={statusStr}
            color={statusStr === "active" ? "success" : "dark"}
            variant="gradient"
            size="sm"
          />
        ),
        components: (
          <MDTypography variant="caption" color="text">
            {typeStr === "composite" ? (compCount ?? "—") + (compCount != null ? " items" : "") : "—"}
          </MDTypography>
        ),
        actions: (
          <MDBox display="flex" gap={1} justifyContent="center">
            <MDButton
              variant="outlined"
              color="info"
              size="small"
              onClick={() => {
                setTab(1);
                setRoot((r) => ({ ...r, sku: p.sku, name: p.name || p.sku }));
              }}
            >
              <Icon sx={{ mr: 0.5 }}>account_tree</Icon> Builder
            </MDButton>
            {canWrite && (
              <MDButton variant="outlined" color="error" size="small" onClick={() => onRemove(p.id)}>
                <Icon sx={{ mr: 0.5 }}>delete</Icon> Remove
              </MDButton>
            )}
          </MDBox>
        ),
      };
    });

    return { columns, rows };
  }, [rowsRaw, canWrite]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox p={2} display="flex" alignItems="center" justifyContent="space-between">
                <MDTypography variant="h5" fontWeight="medium">
                  Products
                </MDTypography>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                  <Tab label="Catalog" />
                  <Tab label="Builder" />
                </Tabs>
              </MDBox>

              {/* CATALOG */}
              {tab === 0 && (
                <MDBox p={3}>
                  {err && (
                    <MDTypography color="error" variant="button" mb={2} display="block">
                      {err}
                    </MDTypography>
                  )}

                  <MDBox
                    component="form"
                    onSubmit={onCreate}
                    display="grid"
                    gridTemplateColumns={{ xs: "1fr", md: "220px 1fr 220px auto" }}
                    gap={2}
                    alignItems="center"
                    mb={2}
                  >
                    <MDInput label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required size="small" />
                    <MDInput
                      label="Product name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      size="small"
                    />

                    <MDSelect
                      select
                      label="Type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      size="small"
                      sx={{ minWidth: 180 }}
                    >
                      <MenuItem value="standard">Standard</MenuItem>
                      <MenuItem value="composite">Composite</MenuItem>
                    </MDSelect>

                    <MDButton type="submit" variant="gradient" color="info" disabled={!canWrite}>
                      <Icon sx={{ mr: 0.5 }}>add</Icon>
                      Add Product
                    </MDButton>
                  </MDBox>

                  {type === "composite" && (
                    <MDBox mt={1} p={2} sx={{ border: "1px dashed rgba(0,0,0,.2)", borderRadius: 1 }}>
                      <MDTypography variant="button" fontWeight="medium" mb={1} display="block">
                        Direct Components (SKU + Quantity)
                      </MDTypography>
                      {components.map((row, idx) => (
                        <MDBox
                          key={idx}
                          display="grid"
                          gridTemplateColumns={{ xs: "1fr", md: "1fr 150px auto" }}
                          gap={1}
                          alignItems="center"
                          mb={1}
                        >
                          <MDInput
                            label={`Component SKU #${idx + 1}`}
                            value={row.sku}
                            onChange={(e) => changeComp(idx, "sku", e.target.value)}
                            size="small"
                            required
                          />
                          <MDInput
                            label="Qty"
                            type="number"
                            inputProps={{ min: 0.0001, step: 1 }}
                            value={row.quantity}
                            onChange={(e) => changeComp(idx, "quantity", e.target.value)}
                            size="small"
                          />
                          <MDButton variant="outlined" color="error" size="small" onClick={() => removeCompRow(idx)}>
                            Remove
                          </MDButton>
                        </MDBox>
                      ))}
                      <MDButton variant="outlined" color="info" size="small" onClick={addCompRow}>
                        + Add another component
                      </MDButton>
                    </MDBox>
                  )}

                  <MDBox mt={3}>
                    <MDBox
                      mx={0}
                      mt={-1}
                      py={2}
                      px={2}
                      variant="gradient"
                      bgColor="info"
                      borderRadius="lg"
                      coloredShadow="info"
                    >
                      <MDTypography variant="h6" color="white">
                        Catalog ({rowsRaw.length})
                      </MDTypography>
                    </MDBox>
                    <MDBox pt={3} px={2} pb={2}>
                      {loading ? (
                        <MDTypography variant="button" color="text">
                          Loading…
                        </MDTypography>
                      ) : (
                        <DataTable
                          table={dataTable}
                          isSorted={false}
                          entriesPerPage={false}
                          showTotalEntries={false}
                          noEndBorder
                        />
                      )}
                    </MDBox>
                  </MDBox>
                </MDBox>
              )}

              {/* BUILDER */}
              {tab === 1 && (
                <MDBox p={3}>
                  {builderErr && (
                    <MDTypography color="error" variant="button" mb={2} display="block">
                      {builderErr}
                    </MDTypography>
                  )}

                  <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <MDTypography variant="h6" fontWeight="medium">
                      N-level Product Builder
                    </MDTypography>
                    <MDBox display="flex" alignItems="center" gap={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={autoCreateLeaves}
                            onChange={(e) => setAutoCreateLeaves(e.target.checked)}
                          />
                        }
                        label="Auto-create missing leaf SKUs"
                      />
                      <MDButton variant="gradient" color="info" onClick={onSaveStructure} disabled={!canWrite || saving}>
                        <Icon sx={{ mr: 0.5 }}>save</Icon> {saving ? "Saving…" : "Save Structure"}
                      </MDButton>
                    </MDBox>
                  </MDBox>

                  {/* Root */}
                  <NodeRow node={root} isRoot onChange={updateNode} onAddChild={addChild} onRemove={removeNode} />

                  {/* Children recursively */}
                  {root.children?.map((c) =>
                    renderTree({
                      node: c,
                      isRoot: false,
                      onChange: updateNode,
                      onAddChild: addChild,
                      onRemove: removeNode,
                    })
                  )}

                  <MDButton
                    variant="outlined"
                    color="info"
                    size="small"
                    onClick={() => addChild(root.id)}
                    sx={{ mt: 1 }}
                  >
                    <Icon sx={{ mr: 0.5 }}>add</Icon> Add root child
                  </MDButton>

                  <MDBox mt={2}>
                    <MDTypography variant="caption" color="text">
                      Tip: Parents are saved as <i>composite</i>. Leaves are <i>standard</i> (auto-created if enabled).
                    </MDTypography>
                  </MDBox>
                </MDBox>
              )}
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}
