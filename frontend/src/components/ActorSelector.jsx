import { useState, useEffect } from "react";
import apiService from "../services/api";

const ActorSelector = ({ onSelectActor, loading }) => {
  const [actors, setActors] = useState([]);
  const [filteredActors, setFilteredActors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [selectedActor, setSelectedActor] = useState(null);
  const [loadingActors, setLoadingActors] = useState(true);

  useEffect(() => {
    const loadActors = async () => {
      try {
        setLoadingActors(true);
        const actorsList = await apiService.getActors();
        setActors(actorsList || []);
      } catch (err) {
        setError("Failed to load actors: " + err.message);
      } finally {
        setLoadingActors(false);
      }
    };

    loadActors();
  }, []);

  useEffect(() => {
    const filtered = actors.filter(
      (actor) =>
        actor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        actor.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        actor.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredActors(filtered);
  }, [actors, searchTerm]);

  const handleActorSelect = (actor) => {
    setSelectedActor(actor);
    onSelectActor(actor);
  };

  if (loadingActors) {
    return (
      <div className="actor-selector">
        <div className="section-header">
          <h3>📦 Loading Actors...</h3>
          <p>Please wait while we fetch available actors</p>
        </div>
      </div>
    );
  }

  return (
    <div className="actor-selector">
      <div className="section-header">
        <h3>📦 Select an Actor</h3>
        <p>Choose from available actors to test the integration</p>
      </div>

      <div className="form-group">
        <input
          type="text"
          placeholder="🔍 Search actors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="actors-grid">
        {filteredActors.map((actor) => (
          <div
            key={actor.id}
            className={`actor-card ${
              selectedActor?.id === actor.id ? "selected" : ""
            }`}
            onClick={() => handleActorSelect(actor)}
          >
            <div className="actor-header">
              <h4>{actor.title}</h4>
              <span className="actor-username">@{actor.username}</span>
            </div>

            <p className="actor-description">
              {actor.description || "No description available"}
            </p>

            <div className="actor-stats">
              <span>🏃 {actor.stats.totalRuns.toLocaleString()} runs</span>
              {actor.isPublic && <span className="public-badge">Public</span>}
            </div>
          </div>
        ))}
      </div>

      {filteredActors.length === 0 && actors.length > 0 && (
        <div className="no-results">
          <p>No actors found matching "{searchTerm}"</p>
        </div>
      )}

      {actors.length === 0 && !loadingActors && (
        <div className="no-actors">
          <p>
            No actors available. The public actors should load automatically for
            testing.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActorSelector;
