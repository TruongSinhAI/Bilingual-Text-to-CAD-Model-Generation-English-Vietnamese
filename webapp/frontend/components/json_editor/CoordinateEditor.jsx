import React from "react";

const CoordinateEditor = ({ data, onChange }) => {
  const handleInputChange = (field, index, value) => {
    const updated = [...data[field]];
    updated[index] = parseFloat(value);
    onChange({ ...data, [field]: updated });
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="font-semibold">Euler Angles (Yaw, Pitch, Roll)</label>
        <div className="flex gap-2 mt-1">
          {data["Euler Angles"].map((val, idx) => (
            <input
              key={idx}
              type="number"
              value={val}
              onChange={(e) =>
                handleInputChange("Euler Angles", idx, e.target.value)
              }
              className="w-full border rounded p-1"
            />
          ))}
        </div>
      </div>

      <div>
        <label className="font-semibold">Translation Vector (X, Y, Z)</label>
        <div className="flex gap-2 mt-1">
          {data["Translation Vector"].map((val, idx) => (
            <input
              key={idx}
              type="number"
              value={val}
              onChange={(e) =>
                handleInputChange("Translation Vector", idx, e.target.value)
              }
              className="w-full border rounded p-1"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoordinateEditor;
