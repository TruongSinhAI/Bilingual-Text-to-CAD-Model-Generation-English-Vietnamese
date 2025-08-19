import React from "react";
import CoordinateEditor from "./CoordinateEditor";
import SketchEditor from "./SketchEditor";
import ExtrusionEditor from "./ExtrusionEditor";

const PartEditor = ({ partId, data, onUpdate }) => {
  const handleCoordChange = (updatedCoord) => {
    onUpdate({
      ...data,
      coordinate_system: updatedCoord,
    });
  };

  const handleSketchChange = (updatedSketch) => {
    onUpdate({
      ...data,
      sketch: updatedSketch,
    });
  };

  const handleExtrusionChange = (updatedExtrusion) => {
    onUpdate({
      ...data,
      extrusion: updatedExtrusion,
    });
  };

  return (
    <div className="border rounded-xl p-4 shadow-md mb-6 bg-white">
      <h2 className="text-xl font-bold mb-4">Part: {partId}</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Coordinate System</h3>
        <CoordinateEditor
          data={data.coordinate_system}
          onChange={handleCoordChange}
        />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Sketch</h3>
        <SketchEditor
          data={data.sketch}
          onChange={handleSketchChange}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Extrusion</h3>
        <ExtrusionEditor
          data={data.extrusion}
          onChange={handleExtrusionChange}
        />
      </div>
    </div>
  );
};

export default PartEditor;
