import { useState, useEffect } from "react";

const SchemaForm = ({ actor, schema, onExecute, loading }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    console.log("Schema received:", schema);
    console.log("Actor:", actor);

    // Initialize form data with default values from schema
    const initialData = {};

    // Always ensure startUrls is present for actors that need it
    if (
      actor?.id === "apify/website-content-crawler" ||
      actor?.name?.includes("crawler") ||
      actor?.name?.includes("scraper")
    ) {
      initialData.startUrls = [{ url: "https://example.com", method: "GET" }];
    }

    if (schema?.properties) {
      Object.entries(schema.properties).forEach(([key, property]) => {
        // Don't override startUrls if already set
        if (key === "startUrls" && initialData.startUrls) {
          return;
        }

        if (property.default !== undefined) {
          initialData[key] = property.default;
        } else if (property.type === "boolean") {
          initialData[key] = false;
        } else if (property.type === "array") {
          if (key === "startUrls") {
            initialData[key] = [{ url: "https://example.com", method: "GET" }];
          } else {
            initialData[key] = [];
          }
        } else if (property.type === "object") {
          initialData[key] = {};
        } else {
          initialData[key] = "";
        }
      });
    }

    console.log("Initial form data:", initialData);
    setFormData(initialData);
    setErrors({});
  }, [schema, actor]);

  const handleInputChange = (key, value) => {
    console.log(`Updating ${key} with:`, value);
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Always require startUrls for scrapers/crawlers
    if (
      (actor?.id === "apify/website-content-crawler" ||
        actor?.name?.includes("crawler") ||
        actor?.name?.includes("scraper")) &&
      (!formData.startUrls ||
        !Array.isArray(formData.startUrls) ||
        formData.startUrls.length === 0)
    ) {
      newErrors.startUrls = "Start URLs are required";
    }

    if (schema?.required) {
      schema.required.forEach((key) => {
        const value = formData[key];
        if (
          !value ||
          (typeof value === "string" && !value.trim()) ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === "object" && Object.keys(value).length === 0)
        ) {
          newErrors[key] = "This field is required";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form data being submitted:", formData);

    if (validateForm()) {
      // Ensure startUrls is properly formatted
      const submitData = { ...formData };
      if (submitData.startUrls && Array.isArray(submitData.startUrls)) {
        // Make sure each URL in startUrls has the correct format
        submitData.startUrls = submitData.startUrls
          .map((url) => {
            if (typeof url === "string") {
              return { url: url, method: "GET" };
            }
            return url;
          })
          .filter((url) => url.url && url.url.trim()); // Remove empty URLs
      }

      console.log("Final submit data:", submitData);
      onExecute(submitData);
    }
  };

  const renderStartUrls = () => {
    const urls = Array.isArray(formData.startUrls) ? formData.startUrls : [];
    const hasError = errors.startUrls;

    return (
      <div className="start-urls-container">
        <h4>Start URLs *</h4>
        <p className="field-description">Enter the URLs you want to crawl</p>

        {urls.map((urlItem, index) => {
          const urlValue =
            typeof urlItem === "object" ? urlItem.url || "" : urlItem || "";

          return (
            <div key={index} className="url-input-group">
              <input
                type="url"
                placeholder="https://example.com"
                value={urlValue}
                onChange={(e) => {
                  const newUrls = [...urls];
                  newUrls[index] = { url: e.target.value, method: "GET" };
                  handleInputChange("startUrls", newUrls);
                }}
                disabled={loading}
                className={hasError ? "error" : ""}
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const newUrls = urls.filter((_, i) => i !== index);
                    handleInputChange("startUrls", newUrls);
                  }}
                  className="remove-url-btn"
                  disabled={loading}
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => {
            const newUrls = [...urls, { url: "", method: "GET" }];
            handleInputChange("startUrls", newUrls);
          }}
          className="add-url-btn"
          disabled={loading}
        >
          + Add URL
        </button>

        {hasError && <div className="field-error">{hasError}</div>}
      </div>
    );
  };

  const renderField = (key, property) => {
    // Handle startUrls specially
    if (key === "startUrls") {
      return renderStartUrls();
    }

    const value = formData[key] || "";
    const hasError = errors[key];

    const baseProps = {
      id: key,
      disabled: loading,
      className: hasError ? "error" : "",
    };

    switch (property.type) {
      case "boolean":
        return (
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleInputChange(key, e.target.checked)}
            disabled={loading}
          />
        );

      case "number":
      case "integer":
        return (
          <input
            type="number"
            {...baseProps}
            value={value}
            onChange={(e) =>
              handleInputChange(key, parseFloat(e.target.value) || 0)
            }
            min={property.minimum}
            max={property.maximum}
            step={property.type === "integer" ? 1 : "any"}
          />
        );

      case "array":
        return (
          <textarea
            {...baseProps}
            value={Array.isArray(value) ? value.join("\n") : value}
            onChange={(e) =>
              handleInputChange(key, e.target.value.split("\n").filter(Boolean))
            }
            placeholder="Enter one item per line"
            rows={4}
          />
        );

      case "object":
        return (
          <textarea
            {...baseProps}
            value={
              typeof value === "object" ? JSON.stringify(value, null, 2) : value
            }
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleInputChange(key, parsed);
              } catch {
                handleInputChange(key, e.target.value);
              }
            }}
            placeholder="Enter valid JSON"
            rows={4}
          />
        );

      default:
        if (property.enum) {
          return (
            <select
              {...baseProps}
              value={value}
              onChange={(e) => handleInputChange(key, e.target.value)}
            >
              <option value="">Select an option</option>
              {property.enum.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }

        return (
          <input
            type="text"
            {...baseProps}
            value={value}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={property.description || `Enter ${key}`}
          />
        );
    }
  };

  // If no schema, create a minimal form with just startUrls
  if (!schema || !schema.properties) {
    return (
      <div className="schema-form">
        <div className="section-header">
          <h3>⚙️ Configure {actor?.title}</h3>
          <p>Basic configuration for this actor</p>
        </div>

        <form onSubmit={handleSubmit}>
          {renderStartUrls()}

          <button type="submit" disabled={loading} className="execute-btn">
            {loading ? "Executing..." : "🚀 Execute Actor"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="schema-form">
      <div className="section-header">
        <h3>⚙️ Configure {actor?.title}</h3>
        <p>Fill in the parameters for this actor</p>
      </div>

      <form onSubmit={handleSubmit}>
        {Object.entries(schema.properties).map(([key, property]) => (
          <div key={key} className="form-group">
            {key !== "startUrls" && (
              <>
                <label htmlFor={key}>
                  {property.title || key}
                  {schema.required?.includes(key) && (
                    <span className="required">*</span>
                  )}
                </label>

                {property.description && (
                  <p className="field-description">{property.description}</p>
                )}
              </>
            )}

            {renderField(key, property)}

            {key !== "startUrls" && errors[key] && (
              <div className="field-error">{errors[key]}</div>
            )}
          </div>
        ))}

        <button type="submit" disabled={loading} className="execute-btn">
          {loading ? "Executing..." : "🚀 Execute Actor"}
        </button>
      </form>
    </div>
  );
};

export default SchemaForm;
