import React, { useState, useEffect } from "react";
import { get, post, del } from "../lib/api.js";
import Table from "../components/Table.jsx";
import Pagination from "../components/Pagination.jsx";

export default function DatabaseViews() {
  const [activeTab, setActiveTab] = useState("views");
  const [views, setViews] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [showCreateViewModal, setShowCreateViewModal] = useState(false);
  const [showCreateProcedureModal, setShowCreateProcedureModal] = useState(false);
  const [showViewDataModal, setShowViewDataModal] = useState(false);
  const [showCallProcedureModal, setShowCallProcedureModal] = useState(false);

  // Form states
  const [viewName, setViewName] = useState("");
  const [selectQuery, setSelectQuery] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const [procedureParams, setProcedureParams] = useState("");
  const [procedureBody, setProcedureBody] = useState("");
  const [selectedView, setSelectedView] = useState(null);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [viewData, setViewData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [procedureCallParams, setProcedureCallParams] = useState("");
  const [procedureResult, setProcedureResult] = useState(null);

  useEffect(() => {
    fetchData();
    fetchTables();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "views") {
        const data = await get("/db/views");
        setViews(data.items || []);
      } else {
        const data = await get("/db/procedures");
        setProcedures(data.items || []);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const data = await get("/db/tables");
      setTables(data.items || []);
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    }
  };

  const handleCreateView = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await post("/db/views", { viewName, selectQuery });
      setSuccess(`View '${viewName}' created successfully!`);
      setShowCreateViewModal(false);
      setViewName("");
      setSelectQuery("");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to create view");
    } finally {
      setLoading(false);
    }
  };

  const handleDropView = async (name) => {
    if (!confirm(`Are you sure you want to drop view '${name}'?`)) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await del(`/db/views/${name}`);
      setSuccess(`View '${name}' dropped successfully!`);
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to drop view");
    } finally {
      setLoading(false);
    }
  };

  const handleViewData = async (viewName) => {
    setLoading(true);
    setError("");
    setSelectedView(viewName);
    setShowViewDataModal(true);
    setPage(1);

    try {
      const offset = 0;
      const data = await get(`/db/views/${viewName}/data`, { limit, offset });
      setViewData(data);
    } catch (err) {
      setError(err.message || "Failed to fetch view data");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    setPage(newPage);
    setLoading(true);

    try {
      const offset = (newPage - 1) * limit;
      const data = await get(`/db/views/${selectedView}/data`, { limit, offset });
      setViewData(data);
    } catch (err) {
      setError(err.message || "Failed to fetch view data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcedure = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await post("/db/procedures", {
        procedureName,
        parameters: procedureParams,
        body: procedureBody,
      });
      setSuccess(`Procedure '${procedureName}' created successfully!`);
      setShowCreateProcedureModal(false);
      setProcedureName("");
      setProcedureParams("");
      setProcedureBody("");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to create procedure");
    } finally {
      setLoading(false);
    }
  };

  const handleDropProcedure = async (name) => {
    if (!confirm(`Are you sure you want to drop procedure '${name}'?`)) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await del(`/db/procedures/${name}`);
      setSuccess(`Procedure '${name}' dropped successfully!`);
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to drop procedure");
    } finally {
      setLoading(false);
    }
  };

  const handleCallProcedure = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const params = procedureCallParams
        ? procedureCallParams.split(",").map((p) => p.trim())
        : [];
      const data = await post(`/db/procedures/${selectedProcedure}/call`, {
        parameters: params,
      });
      setProcedureResult(data.result);
      setSuccess("Procedure executed successfully!");
    } catch (err) {
      setError(err.message || "Failed to call procedure");
    } finally {
      setLoading(false);
    }
  };

  const insertExampleQuery = (type) => {
    if (type === "simple") {
      setSelectQuery("SELECT * FROM States WHERE StateID <= 5");
    } else if (type === "join") {
      setSelectQuery(`SELECT 
  d.DepartmentID,
  d.DepartmentName,
  s.StateName
FROM Departments d
INNER JOIN States s ON d.StateID = s.StateID`);
    } else if (type === "aggregate") {
      setSelectQuery(`SELECT 
  StateID,
  COUNT(*) as DepartmentCount
FROM Departments
GROUP BY StateID`);
    }
  };

  const insertExampleProcedure = (type) => {
    if (type === "simple") {
      setProcedureParams("IN stateId INT");
      setProcedureBody(`SELECT * FROM States WHERE StateID = stateId;`);
    } else if (type === "insert") {
      setProcedureParams("IN stateName VARCHAR(100), IN stateCode VARCHAR(10)");
      setProcedureBody(`INSERT INTO States (StateName, StateCode) VALUES (stateName, stateCode);`);
    } else if (type === "update") {
      setProcedureParams("IN deptId INT, IN newName VARCHAR(200)");
      setProcedureBody(`UPDATE Departments SET DepartmentName = newName WHERE DepartmentID = deptId;`);
    }
  };

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Database Views & Procedures</h1>
        <p className="subtitle">Manage MySQL views and stored procedures</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
          <button className="alert-close" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <strong>Success:</strong> {success}
          <button className="alert-close" onClick={() => setSuccess("")}>
            ×
          </button>
        </div>
      )}

      <div className="tabContainer">
        <div className="tabs">
          <button
            className={activeTab === "views" ? "tab active" : "tab"}
            onClick={() => setActiveTab("views")}
          >
            📊 Views ({views.length})
          </button>
          <button
            className={activeTab === "procedures" ? "tab active" : "tab"}
            onClick={() => setActiveTab("procedures")}
          >
            ⚙️ Procedures ({procedures.length})
          </button>
        </div>
      </div>

      {activeTab === "views" && (
        <div className="tabContent">
          <div className="actionBar">
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateViewModal(true)}
            >
              ➕ Create View
            </button>
            <button className="btn btn-secondary" onClick={fetchData}>
              🔄 Refresh
            </button>
          </div>

          {loading && <div className="spinner">Loading...</div>}

          {!loading && views.length === 0 && (
            <div className="emptyState">
              <p>No views found. Create your first view!</p>
            </div>
          )}

          {!loading && views.length > 0 && (
            <div className="viewsList">
              {views.map((view) => (
                <div key={view.viewName} className="viewCard">
                  <div className="viewCardHeader">
                    <h3>{view.viewName}</h3>
                    <div className="viewCardActions">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleViewData(view.viewName)}
                        title="View Data"
                      >
                        👁️ Data
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDropView(view.viewName)}
                        title="Drop View"
                      >
                        🗑️ Drop
                      </button>
                    </div>
                  </div>
                  <div className="viewCardBody">
                    <p className="viewDefinition">
                      <strong>Definition:</strong>
                    </p>
                    <pre className="codeBlock">{view.definition}</pre>
                    <div className="viewMeta">
                      <span className="badge">
                        {view.isUpdatable === "YES" ? "✅ Updatable" : "🔒 Read-only"}
                      </span>
                      <span className="badge">👤 {view.definer}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "procedures" && (
        <div className="tabContent">
          <div className="actionBar">
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateProcedureModal(true)}
            >
              ➕ Create Procedure
            </button>
            <button className="btn btn-secondary" onClick={fetchData}>
              🔄 Refresh
            </button>
          </div>

          {loading && <div className="spinner">Loading...</div>}

          {!loading && procedures.length === 0 && (
            <div className="emptyState">
              <p>No procedures found. Create your first procedure!</p>
            </div>
          )}

          {!loading && procedures.length > 0 && (
            <div className="viewsList">
              {procedures.map((proc) => (
                <div key={proc.procedureName} className="viewCard">
                  <div className="viewCardHeader">
                    <h3>{proc.procedureName}</h3>
                    <div className="viewCardActions">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setSelectedProcedure(proc.procedureName);
                          setShowCallProcedureModal(true);
                          setProcedureCallParams("");
                          setProcedureResult(null);
                        }}
                        title="Call Procedure"
                      >
                        ▶️ Execute
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDropProcedure(proc.procedureName)}
                        title="Drop Procedure"
                      >
                        🗑️ Drop
                      </button>
                    </div>
                  </div>
                  <div className="viewCardBody">
                    {proc.comment && (
                      <p className="procedureComment">
                        <strong>Comment:</strong> {proc.comment}
                      </p>
                    )}
                    <div className="viewMeta">
                      <span className="badge">📅 {new Date(proc.created).toLocaleDateString()}</span>
                      <span className="badge">👤 {proc.definer}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create View Modal */}
      {showCreateViewModal && (
        <div className="modal-overlay" onClick={() => setShowCreateViewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New View</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateViewModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateView}>
              <div className="modal-body">
                <div className="form-group">
                  <label>View Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    placeholder="e.g., vw_department_summary"
                    required
                    pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                    title="Must start with letter or underscore, contain only letters, numbers, and underscores"
                  />
                  <small>Use only letters, numbers, and underscores</small>
                </div>

                <div className="form-group">
                  <label>SELECT Query *</label>
                  <textarea
                    className="form-control code-textarea"
                    value={selectQuery}
                    onChange={(e) => setSelectQuery(e.target.value)}
                    placeholder="SELECT column1, column2 FROM table_name WHERE condition"
                    rows="8"
                    required
                  />
                  <small>Enter your SELECT statement (without CREATE VIEW)</small>
                </div>

                <div className="exampleButtons">
                  <p><strong>Quick Examples:</strong></p>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => insertExampleQuery("simple")}
                  >
                    Simple SELECT
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => insertExampleQuery("join")}
                  >
                    JOIN Example
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => insertExampleQuery("aggregate")}
                  >
                    Aggregate Example
                  </button>
                </div>

                {tables.length > 0 && (
                  <div className="availableTables">
                    <p><strong>Available Tables:</strong></p>
                    <div className="tableTags">
                      {tables.map((t) => (
                        <span key={t.tableName} className="badge badge-info">
                          {t.tableName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateViewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating..." : "Create View"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Procedure Modal */}
      {showCreateProcedureModal && (
        <div className="modal-overlay" onClick={() => setShowCreateProcedureModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Procedure</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateProcedureModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateProcedure}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Procedure Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={procedureName}
                    onChange={(e) => setProcedureName(e.target.value)}
                    placeholder="e.g., sp_get_state_departments"
                    required
                    pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                  />
                </div>

                <div className="form-group">
                  <label>Parameters</label>
                  <input
                    type="text"
                    className="form-control"
                    value={procedureParams}
                    onChange={(e) => setProcedureParams(e.target.value)}
                    placeholder="e.g., IN stateId INT, OUT total INT"
                  />
                  <small>Leave empty if no parameters</small>
                </div>

                <div className="form-group">
                  <label>Procedure Body *</label>
                  <textarea
                    className="form-control code-textarea"
                    value={procedureBody}
                    onChange={(e) => setProcedureBody(e.target.value)}
                    placeholder="SELECT * FROM States;"
                    rows="10"
                    required
                  />
                  <small>Enter SQL statements (without BEGIN/END)</small>
                </div>

                <div className="exampleButtons">
                  <p><strong>Quick Examples:</strong></p>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => insertExampleProcedure("simple")}
                  >
                    Simple SELECT
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => insertExampleProcedure("insert")}
                  >
                    INSERT Example
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => insertExampleProcedure("update")}
                  >
                    UPDATE Example
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateProcedureModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating..." : "Create Procedure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Data Modal */}
      {showViewDataModal && (
        <div className="modal-overlay" onClick={() => setShowViewDataModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Data: {selectedView}</h2>
              <button
                className="modal-close"
                onClick={() => setShowViewDataModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {loading && <div className="spinner">Loading...</div>}
              {!loading && viewData.items.length === 0 && (
                <p>No data in this view</p>
              )}
              {!loading && viewData.items.length > 0 && (
                <>
                  <Table data={viewData.items} />
                  {viewData.total > limit && (
                    <Pagination
                      currentPage={page}
                      totalPages={Math.ceil(viewData.total / limit)}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowViewDataModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Procedure Modal */}
      {showCallProcedureModal && (
        <div className="modal-overlay" onClick={() => setShowCallProcedureModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Execute: {selectedProcedure}</h2>
              <button
                className="modal-close"
                onClick={() => setShowCallProcedureModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCallProcedure}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Parameters (comma-separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={procedureCallParams}
                    onChange={(e) => setProcedureCallParams(e.target.value)}
                    placeholder="e.g., 1, 'value', 100"
                  />
                  <small>Enter parameter values separated by commas</small>
                </div>

                {procedureResult && (
                  <div className="resultSection">
                    <h4>Result:</h4>
                    <pre className="codeBlock">
                      {JSON.stringify(procedureResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCallProcedureModal(false)}
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Executing..." : "Execute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
