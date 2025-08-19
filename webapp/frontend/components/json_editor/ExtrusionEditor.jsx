import React from "react";

const ExtrusionEditor = ({ data, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: field === "operation" ? value : parseFloat(value) });
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="font-semibold">Depth Towards Normal</label>
        <input
          type="number"
          value={data.extrude_depth_towards_normal}
          onChange={(e) => handleChange("extrude_depth_towards_normal", e.target.value)}
          className="w-full border rounded p-1"
        />
      </div>

      <div>
        <label className="font-semibold">Depth Opposite Normal</label>
        <input
          type="number"
          value={data.extrude_depth_opposite_normal}
          onChange={(e) => handleChange("extrude_depth_opposite_normal", e.target.value)}
          className="w-full border rounded p-1"
        />
      </div>

      <div>
        <label className="font-semibold">Sketch Scale</label>
        <input
          type="number"
          value={data.sketch_scale}
          onChange={(e) => handleChange("sketch_scale", e.target.value)}
          className="w-full border rounded p-1"
        />
      </div>

      <div>
        <label className="font-semibold">Operation</label>
        <select
          value={data.operation}
          onChange={(e) => handleChange("operation", e.target.value)}
          className="w-full border rounded p-1"
        >
          <option value="NewBodyFeatureOperation">New Body</option>
          <option value="CutFeatureOperation">Cut</option>
          <option value="JoinFeatureOperation">Join</option>
          <option value="IntersectFeatureOperation">Intersect</option>
        </select>
      </div>
    </div>
  );
};

export default ExtrusionEditor;
