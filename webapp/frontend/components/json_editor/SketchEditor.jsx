import React from "react";

const SketchEditor = ({ data, onChange }) => {
  const faceId = Object.keys(data)[0];
  const loopId = Object.keys(data[faceId])[0];
  const lines = data[faceId][loopId];

  const handleLineChange = (lineId, pointType, index, value) => {
    const updatedLines = { ...lines };
    updatedLines[lineId][pointType][index] = parseFloat(value);
    onChange({
      [faceId]: {
        [loopId]: updatedLines,
      },
    });
  };

  const handleDeleteLine = (lineId) => {
    const updatedLines = { ...lines };
    delete updatedLines[lineId];
    onChange({
      [faceId]: {
        [loopId]: updatedLines,
      },
    });
  };

  return (
    <div className="space-y-4">
      {Object.entries(lines).map(([lineId, lineData]) => (
        <div key={lineId} className="border p-2 rounded shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">{lineId}</span>
            <button
              onClick={() => handleDeleteLine(lineId)}
              className="text-red-600 text-sm hover:underline"
            >
              Delete
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Start Point (x, y)</label>
              <div className="flex gap-2">
                {lineData["Start Point"].map((val, idx) => (
                  <input
                    key={idx}
                    type="number"
                    value={val}
                    onChange={(e) =>
                      handleLineChange(lineId, "Start Point", idx, e.target.value)
                    }
                    className="w-full border rounded p-1"
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">End Point (x, y)</label>
              <div className="flex gap-2">
                {lineData["End Point"].map((val, idx) => (
                  <input
                    key={idx}
                    type="number"
                    value={val}
                    onChange={(e) =>
                      handleLineChange(lineId, "End Point", idx, e.target.value)
                    }
                    className="w-full border rounded p-1"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SketchEditor;
