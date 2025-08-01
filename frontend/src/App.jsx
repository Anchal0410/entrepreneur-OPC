import { useState, useEffect } from "react";
import ApiKeyForm from "./components/ApiKeyForm";
import ActorSelector from "./components/ActorSelector";
import SchemaForm from "./components/SchemaForm";
import ExecutionResults from "./components/ExecutionResults";
import apiService from "./services/api";
import "./App.css";

function App() {
  const [currentStep, setCurrentStep] = useState("auth");
  const [user, setUser] = useState(null);
  const [actors, setActors] = useState([]);
  const [selectedActor, setSelectedActor] = useState(null);
  const [actorSchema, setActorSchema] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApiKeyValidation = async (apiKey) => {
    setLoading(true);
    setError("");

    try {
      const result = await apiService.validateApiKey(apiKey);
      setUser(result.user);
      await loadActors();
      setCurrentStep("selectActor");
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadActors = async () => {
    try {
      const actorsList = await apiService.getActors();
      setActors(actorsList);
    } catch (err) {
      setError("Failed to load actors: " + err.message);
    }
  };

  const handleActorSelection = async (actor) => {
    setLoading(true);
    setSelectedActor(actor);
    setError("");

    try {
      const schemaData = await apiService.getActorSchema(actor.id);
      setActorSchema(schemaData.inputSchema);
      setCurrentStep("configure");
    } catch (err) {
      setError("Failed to load actor schema: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecution = async (inputData) => {
    setLoading(true);
    setError("");

    try {
      const result = await apiService.executeActor(selectedActor.id, inputData);
      setExecutionResult(result);
      setCurrentStep("results");
    } catch (err) {
      setError("Failed to execute actor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePollStatus = async (runId) => {
    try {
      const result = await apiService.getRunStatus(runId);
      setExecutionResult(result);
    } catch (err) {
      console.error("Failed to poll status:", err);
    }
  };

  const resetToStart = () => {
    setCurrentStep("auth");
    setUser(null);
    setActors([]);
    setSelectedActor(null);
    setActorSchema(null);
    setExecutionResult(null);
    setError("");
  };

  const goBackToActorSelection = () => {
    setCurrentStep("selectActor");
    setSelectedActor(null);
    setActorSchema(null);
    setExecutionResult(null);
    setError("");
  };

  const goBackToConfiguration = () => {
    setCurrentStep("configure");
    setExecutionResult(null);
    setError("");
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Apify Integration Dashboard</h1>
        {user && (
          <div className="user-info">
            <span>Welcome, {user.username}!</span>
            <button onClick={resetToStart} className="logout-btn">
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {error && (
          <div className="global-error">
            <p>❌ {error}</p>
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        {currentStep === "auth" && (
          <ApiKeyForm onValidate={handleApiKeyValidation} loading={loading} />
        )}

        {currentStep === "selectActor" && (
          <>
            <ActorSelector
              actors={actors}
              onSelectActor={handleActorSelection}
              loading={loading}
            />
            {actors.length === 0 && (
              <div className="loading-state">
                <p>Loading your actors...</p>
              </div>
            )}
          </>
        )}

        {currentStep === "configure" && selectedActor && (
          <>
            <div className="breadcrumb">
              <button onClick={goBackToActorSelection}>← Back to Actors</button>
            </div>
            <SchemaForm
              actor={selectedActor}
              schema={actorSchema}
              onExecute={handleExecution}
              loading={loading}
            />
          </>
        )}

        {currentStep === "results" && (
          <>
            <div className="breadcrumb">
              <button onClick={goBackToActorSelection}>← Back to Actors</button>
              <button onClick={goBackToConfiguration}>
                ← Back to Configuration
              </button>
            </div>
            <ExecutionResults
              result={executionResult}
              onPollStatus={handlePollStatus}
            />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with React + Vite | Powered by Apify API</p>
      </footer>
    </div>
  );
}

export default App;
