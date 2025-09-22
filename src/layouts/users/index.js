import { useEffect, useMemo, useState } from "react";

// @mui
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";

// MD2 components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDBadge from "components/MDBadge";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";

// API
import { listUsers, createUser, updateUser, removeUser } from "api/users";
import { useAuth } from "auth/AuthProvider";


export default function UsersPage() {
  const { perms } = useAuth();
  const canWrite = !!perms?.includes("user.write");

  const [rowsRaw, setRowsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // create form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");

  // inline edit state
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const data = await listUsers();
      setRowsRaw(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    try {
      await createUser({ name, email, password: password || undefined, role });
      setName(""); setEmail(""); setPassword(""); setRole("viewer");
      refresh();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Failed to create user.";
      setErr(msg);
    }
  }

  function beginEdit(u) {
    setEditId(u.id);
    setEditName(u.name || "");
    setEditEmail(u.email || "");
  }
  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditEmail("");
  }
  async function saveEdit() {
    try {
      await updateUser(editId, { name: editName, email: editEmail });
      // optimistic update
      setRowsRaw((prev) => prev.map(r => r.id === editId ? { ...r, name: editName, email: editEmail } : r));
      cancelEdit();
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Failed to update user.");
    }
  }

  async function onChangeRole(userId, newRole) {
    try {
      await updateUser(userId, { role: newRole });
      setRowsRaw((prev) => prev.map(r => r.id === userId ? { ...r, role: newRole, roles: [newRole] } : r));
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Failed to update role.");
    }
  }

  async function onChangeStatus(userId, newStatus) {
    try {
      await updateUser(userId, { status: newStatus });
      setRowsRaw((prev) => prev.map(r => r.id === userId ? { ...r, status: newStatus } : r));
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Failed to update status.");
    }
  }

  async function onRemove(userId) {
    if (!window.confirm("Remove this user from your tenant?")) return;
    try {
      await removeUser(userId);
      setRowsRaw((prev) => prev.filter(r => r.id !== userId));
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Failed to remove user.");
    }
  }

  // Map API rows -> DataTable rows
  const dataTable = useMemo(() => {
    const columns = [
      { Header: "Name", accessor: "name", width: "26%", align: "left" },
      { Header: "Email", accessor: "email", align: "left" },
      { Header: "Role", accessor: "role", align: "left" },
      { Header: "Status", accessor: "status", align: "center" },
      { Header: "Edit", accessor: "edit", align: "center" },
      { Header: "Actions", accessor: "actions", align: "center" },
    ];

    const rows = rowsRaw.map((u) => {
      const roleStr = u.role || (Array.isArray(u.roles) ? (u.roles[0] || "viewer") : "viewer");
      const statusStr = u.status || "active";
      const isOwner = roleStr === 'owner' || (Array.isArray(u.roles) && u.roles.includes('owner'));
      const isEditing = editId === u.id;

      return {
        name: (
          isEditing ? (
            <MDInput value={editName} onChange={(e)=>setEditName(e.target.value)} size="small" fullWidth />
          ) : (
            <MDBox lineHeight={1}>
              <MDTypography display="block" variant="button" fontWeight="medium">
                {u.name || "-"}
              </MDTypography>
              <MDTypography variant="caption" color="text">#{u.id}</MDTypography>
            </MDBox>
          )
        ),
        email: (
          isEditing ? (
            <MDInput value={editEmail} onChange={(e)=>setEditEmail(e.target.value)} size="small" fullWidth />
          ) : (
            <MDTypography variant="caption" color="text" fontWeight="medium">{u.email}</MDTypography>
          )
        ),
        role: (
          canWrite && !isOwner ? (
            <MDInput
              select
              value={roleStr}
              onChange={(e)=>onChangeRole(u.id, e.target.value)}
              size="small"
              sx={{ minWidth: 140, '& .MuiInputBase-input': { py: 1 } }}
            >
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </MDInput>
          ) : (
            <MDBadge badgeContent={roleStr} color={roleStr === 'admin' ? 'info' : (roleStr === 'owner' ? 'warning' : 'secondary')} variant="gradient" size="sm" />
          )
        ),
        status: (
          canWrite ? (
            <MDInput
              select
              value={statusStr}
              onChange={(e)=>onChangeStatus(u.id, e.target.value)}
              size="small"
              sx={{ minWidth: 140, '& .MuiInputBase-input': { py: 1 } }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
            </MDInput>
          ) : (
            <MDBadge badgeContent={statusStr} color={statusStr === 'active' ? 'success' : 'dark'} variant="gradient" size="sm" />
          )
        ),
        edit: (
          canWrite ? (
            isEditing ? (
              <MDBox display="flex" gap={1} justifyContent="center">
                <MDButton variant="gradient" color="success" size="small" onClick={saveEdit}>
                  <Icon sx={{ mr: 0.5 }}>save</Icon> Save
                </MDButton>
                <MDButton variant="outlined" color="secondary" size="small" onClick={cancelEdit}>
                  <Icon sx={{ mr: 0.5 }}>close</Icon> Cancel
                </MDButton>
              </MDBox>
            ) : (
              <MDButton variant="outlined" color="info" size="small" onClick={()=>beginEdit(u)}>
                <Icon sx={{ mr: 0.5 }}>edit</Icon> Edit
              </MDButton>
            )
          ) : (
            <MDTypography variant="caption" color="text">—</MDTypography>
          )
        ),
        actions: (
          canWrite ? (
            <MDButton variant="outlined" color="error" size="small" onClick={()=>onRemove(u.id)} disabled={isOwner}>
              Remove
            </MDButton>
          ) : (
            <MDTypography variant="caption" color="text">—</MDTypography>
          )
        )
      };
    });

    return { columns, rows };
  }, [rowsRaw, canWrite, editId, editName, editEmail]);

  return (
    <DashboardLayout>
      <DashboardNavbar />

      <MDBox py={3}>
        <Grid container spacing={3}>
          {/* Create / Invite form */}
          <Grid item xs={12}>
            <Card>
              <MDBox p={3}>
                <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <MDTypography variant="h5" fontWeight="medium">Users</MDTypography>
                  <MDTypography variant="button" color="text">Manage members of your organization</MDTypography>
                </MDBox>

                {err && (
                  <MDTypography color="error" variant="button" mb={2} display="block">{err}</MDTypography>
                )}

                <MDBox
                  component="form"
                  onSubmit={onCreate}
                  display="grid"
                  gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr 1fr 200px auto' }}
                  gap={2}
                  alignItems="center"
                >
                  <MDInput
                    label="Full name"
                    value={name}
                    onChange={(e)=>setName(e.target.value)}
                    required
                    size="small"
                  />

                  <MDInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    required
                    size="small"
                  />

                  <MDInput
                    label="Password (optional)"
                    type="password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    size="small"
                  />

                  {/* Role select — CSS fixed: tighter height + consistent width */}
                  <MDInput
                    select
                    label="Role"
                    value={role}
                    onChange={(e)=>setRole(e.target.value)}
                    size="small"
                    sx={{ minWidth: 180, '& .MuiInputBase-input': { py: 1 } }}
                  >
                    <MenuItem value="viewer">Viewer</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </MDInput>

                  <MDButton type="submit" variant="gradient" color="info" disabled={!canWrite}>
                    <Icon sx={{ mr: 0.5 }}>person_add</Icon>
                    Invite / Create
                  </MDButton>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>

          {/* Users table */}
          <Grid item xs={12}>
            <Card>
              <MDBox mx={2} mt={-1} py={3} px={2} variant="gradient" bgColor="info" borderRadius="lg" coloredShadow="info">
                <MDTypography variant="h6" color="white">Members ({rowsRaw.length})</MDTypography>
              </MDBox>

              <MDBox pt={3} px={2} pb={2}>
                {loading ? (
                  <MDTypography variant="button" color="text">Loading…</MDTypography>
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
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}
