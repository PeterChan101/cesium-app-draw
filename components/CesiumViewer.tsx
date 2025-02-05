// components/CesiumViewer.tsx

import { useState, useEffect, useRef, Key } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import Script from 'next/script';
import dotImage from "./dot";
import * as THREE from 'three';




const CesiumViewer: React.FC = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const [polygons, setPolygons] = useState<Cesium.Entity[]>([]);
  const [editingPolygon, setEditingPolygon] = useState<Cesium.Entity | null>(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);

  // For corner dragging
  const [isDraggingCorner, setIsDraggingCorner] = useState(false);
  const [draggedCornerIndex, setDraggedCornerIndex] = useState<number | null>(null);
  const [draggedCornerPolygonId, setDraggedCornerPolygonId] = useState<string | null>(null);

  // Use a reference to store billboard entities of corners for the selected polygon
  const cornerBillboardsRef = useRef<Cesium.Entity[]>([]);

  const init = () => {

    if (typeof window !== "undefined") {
      window.CESIUM_BASE_URL = "/cesium";
    }
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmNzA1Mjg0ZC1lYjlhLTQ1MGUtODJkZS1jNDc1Y2Q0ODIxYmEiLCJpZCI6MjY2NDg5LCJpYXQiOjE3MzU4OTMyNTF9.YtvGGBuqmEg-bMXkCC7KIrrt4eYnKrwkUkm8EKAaJCg';
    const cesiumViewer = new Cesium.Viewer("cesiumContainer", {
      baseLayerPicker: false,
      timeline: false,
      animation: false,
      vrButton: false,
      fullscreenButton: false,
      homeButton: false,
      navigationHelpButton: false,
      geocoder: false,
      sceneModePicker: false,
      infoBox: false,
      selectionIndicator: false,
      // requestRenderMode: true,
      //           geocoder : false,
      //   baseLayerPicker: false,
      // baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      //     Cesium.TileMapServiceImageryProvider.fromUrl(
      //       Cesium.buildModuleUrl("/cesium/Assets/Textures/NaturalEarthII"),
      //     //   Cesium.buildModuleUrl("https://tile.openstreetmap.org/"),
      //     ),
      //     {
      //     }
      //   ),
    });

    setViewer(cesiumViewer);



    // cesiumViewer.camera.changed.addEventListener(syncCameras);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // cesiumViewer.camera.moveEnd.addEventListener(syncCameras);


    cesiumViewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        114.155577,
        22.298555,
        500.75941748137
      ),
      orientation: {
        heading: 0, // No rotation
        pitch: Cesium.Math.toRadians(-90), // Look straight down
        roll: 0 // No roll
      },
      duration: 0,
    });




    return () => {
      cesiumViewer.destroy();
    };
  }
  /**
   * Updates the corner billboards for the selected polygon.
   * Clears existing billboards and adds new ones for each vertex in the polygon's hierarchy.
   */
  const updateCornerBillboards = () => {
    if (!viewer) return;

    // Remove old corner billboards
    cornerBillboardsRef.current.forEach((entity) => {
      viewer.entities.removeById(entity.id);
    });
    cornerBillboardsRef.current = [];

    // If there's no selected polygon, do nothing
    if (!selectedPolygonId) return;

    const selectedPolygon =
      polygons.find((p) => p.id === selectedPolygonId) || editingPolygon;

    if (!selectedPolygon?.polygon) return;

    const polygonPositions = selectedPolygon.polygon.hierarchy?.getValue()?.positions;
    if (!Array.isArray(polygonPositions)) return;

    // Create a new billboard at each corner
    polygonPositions.forEach((pos, index) => {
      const billboard = viewer.entities.add({
        position: pos,
        billboard: {
          image: dotImage, // small dot image
          scale: 0.04,
          color: Cesium.Color.BLUE,
        },
        properties: {
          cornerIndex: index,
          polygonId: selectedPolygonId,
        },
      });
      cornerBillboardsRef.current.push(billboard);
    });
  };

  /**
   * Rebuilds the polygon's positions array after one corner is moved.
   */
  const updatePolygonCorner = (
    polygonEntity: Cesium.Entity,
    cornerIndex: number,
    newPosition: Cesium.Cartesian3
  ) => {
    const hierarchy = polygonEntity.polygon?.hierarchy?.getValue();
    if (!hierarchy) return;

    const newPositions = [...hierarchy.positions];
    newPositions[cornerIndex] = newPosition;

    polygonEntity.polygon!.hierarchy = new Cesium.ConstantProperty(
      new Cesium.PolygonHierarchy(newPositions)
    );
  };

  useEffect(() => {
    updateCornerBillboards();
  }, [selectedPolygonId, polygons, editingPolygon]);
  useEffect(() => {
    if (viewer != null) {
      return;
    }
    init();
  })
  useEffect(() => {
    if (!viewer) { return; }

    const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    clickHandler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {

      const picked = viewer.scene.pick(movement.position);
      if (Cesium.defined(picked) && picked.id?.properties) {
        const cornerIndex = picked.id.properties.cornerIndex?.getValue();
        const polygonId = picked.id.properties.polygonId?.getValue();

        if (cornerIndex != null && polygonId != null) {
          // We're picking a corner
          setIsDraggingCorner(true);
          setDraggedCornerIndex(cornerIndex);
          setDraggedCornerPolygonId(polygonId);
          // Also ensure the polygon is selected
          setSelectedPolygonId(polygonId);
          const ssc = viewer.scene.screenSpaceCameraController;
          ssc.enableRotate = false;
          ssc.enableTranslate = false;
          ssc.enableTilt = false;
          ssc.enableLook = false;
        }
      } else if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity && picked.id.polygon) {
        // Possibly a polygon entity
        setSelectedPolygonId(picked.id.id);
      } else {
        // cliked on nothing
        if (isDrawing) {
          const ray = viewer.camera.getPickRay(movement.position);
          if (!ray) return;

          const position = viewer.scene.globe.pick(ray, viewer.scene);
          if (position) {
            if (editingPolygon?.polygon) {
              const positions = editingPolygon.polygon.hierarchy?.getValue()?.positions;
              const newPositions = insertPositionBetweenClosestVertices(
                positions,
                position
              );
              const currentPolygon = viewer.entities.getById(editingPolygon.id);
              if (currentPolygon?.polygon) {

                currentPolygon.polygon.hierarchy = new Cesium.ConstantProperty(new Cesium.PolygonHierarchy(newPositions));
                setEditingPolygon(currentPolygon);
                updateCornerBillboards();
              }
            } else {
              const newPolygon = new Cesium.PolygonGraphics({
                hierarchy: new Cesium.PolygonHierarchy([position]),
                material: Cesium.Color.YELLOW.withAlpha(0.35),
                outline: true,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2
              });
              const newEntity = viewer.entities.add({ polygon: newPolygon });
              setEditingPolygon(newEntity);
              setSelectedPolygonId(newEntity.id);
            }
          }
        } else {
          setSelectedPolygonId(null);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    clickHandler.setInputAction(() => {

      setIsDraggingCorner(false);
      setDraggedCornerIndex(null);
      setDraggedCornerPolygonId(null);

      // Re-enable camera movement
      const ssc = viewer.scene.screenSpaceCameraController;
      ssc.enableRotate = true;
      ssc.enableTranslate = true;
      ssc.enableTilt = true;
      ssc.enableLook = true;

    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    return () => {
      clickHandler.destroy();
    };
  }, [viewer, isDrawing, editingPolygon]);

  useEffect(() => {
    if (!viewer) return;

    const moveHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    moveHandler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      if (!isDraggingCorner || draggedCornerIndex === null || !draggedCornerPolygonId) return;

      const ray = viewer.camera.getPickRay(movement.endPosition);
      if (!ray) return;

      const newPosition = viewer.scene.globe.pick(ray, viewer.scene);
      if (!newPosition) return;

      // Update the corresponding polygon
      const polygonToUpdate =
        polygons.find((p) => p.id === draggedCornerPolygonId) || editingPolygon;
      if (!polygonToUpdate) return;

      updatePolygonCorner(polygonToUpdate, draggedCornerIndex, newPosition);

      // Also update the billboard so it moves visually
      if (cornerBillboardsRef.current[draggedCornerIndex]) {
        cornerBillboardsRef.current[draggedCornerIndex].position = new Cesium.ConstantPositionProperty(newPosition);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);


    moveHandler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.position);

      // Check if we clicked on a corner billboard
      if (Cesium.defined(picked) && picked.id?.properties) {
        const cornerIndex = picked.id.properties.cornerIndex?.getValue();
        const polygonId = picked.id.properties.polygonId?.getValue();

        // If valid corner, remove that corner
        if (cornerIndex != null && polygonId != null) {
          // Find the relevant polygon (either from polygons or editingPolygon)
          const polygonToUpdate = polygons.find((p) => p.id === polygonId) || editingPolygon;
          if (!polygonToUpdate || !polygonToUpdate.polygon) return;

          const hierarchy = polygonToUpdate.polygon.hierarchy?.getValue();
          if (!hierarchy || !Array.isArray(hierarchy.positions)) return;

          // Remove the corner from the array
          const newPositions = [...hierarchy.positions];
          newPositions.splice(cornerIndex, 1); // remove the cornerIndex-th vertex

          // Update the polygon
          polygonToUpdate.polygon.hierarchy = new Cesium.ConstantProperty(
            new Cesium.PolygonHierarchy(newPositions)
          );
          const entity = viewer.entities.getById(polygonId);
          if (!entity || !entity.polygon) return;
          entity.polygon.hierarchy = new Cesium.ConstantProperty(
            new Cesium.PolygonHierarchy(newPositions)
          );;

          // Also remove the billboard from cornerBillboardsRef
          const cornerBillboardToRemove = cornerBillboardsRef.current[cornerIndex];
          if (cornerBillboardToRemove) {
            viewer.entities.remove(cornerBillboardToRemove);
          }
          cornerBillboardsRef.current.splice(cornerIndex, 1);

          // Reassign corner indices so we can still pick them properly
          cornerBillboardsRef.current.forEach((billboardEntity, index) => {
            if (!billboardEntity.properties) return;
            billboardEntity.properties.cornerIndex = new Cesium.ConstantProperty(index);
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    return () => {
      moveHandler.destroy();
    };
  }, [
    viewer,
    isDraggingCorner,
    draggedCornerIndex,
    draggedCornerPolygonId,
    polygons,
    editingPolygon,
  ]);


  const startDrawing = () => {
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    if (editingPolygon) {
      const newPolygon = new Cesium.PolygonGraphics({
        hierarchy: new Cesium.PolygonHierarchy(editingPolygon.polygon?.hierarchy?.getValue().positions),
        material: Cesium.Color.BLUE.withAlpha(0.35),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
      });
      if (viewer) {

        viewer.entities.removeById(editingPolygon.id);
        const addedPolygon = viewer.entities.add({ polygon: newPolygon });
        setPolygons((prev) => [
          ...prev.filter((polygon) => polygon.id !== editingPolygon.id), addedPolygon
        ]);
      }
    }
    setIsDrawing(false);
    setSelectedPolygonId(null);
    setEditingPolygon(null);
  };

  const removePolygonById = (id: string) => {
    if (viewer) {
      viewer.entities.removeById(id);
      setPolygons((prev) => prev.filter((polygon) => polygon.id !== id));
    }
  };

  const removeSelectedPolygon = () => {
    if (selectedPolygonId) {
      removePolygonById(selectedPolygonId);
      setSelectedPolygonId(null);
    }
  };

  const editSelectedPolygon = () => {
    if (selectedPolygonId) {
      setEditingPolygon(polygons.find((p) => p.id === selectedPolygonId) ?? null);
      setIsDrawing(true);
    }
  }


  const getButtonStyle = (disabled: boolean) => ({
    backgroundColor: disabled ? "#6c757d" : "#007bff", // Gray if disabled, blue if active
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "14px",
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : "0 2px 4px rgba(0, 0, 0, 0.2)",
    transition: "background-color 0.3s ease",
  });

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Scripts (Potree, jQuery, proj4, etc.) */}


      {/* Left Section: Cesium viewer and controls */}
      <div style={{ width: "75%", position: "relative" }}>
        <div id="cesiumContainer" style={{ width: "100%", height: "75%" }}></div>
        {/* Buttons container with Flexbox and spacing */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            zIndex: 10,
            display: "flex",
            gap: "8px", // Space between buttons
            flexWrap: "wrap", // Allows buttons to wrap if the container is too small
          }}
        >
          <button
            onClick={startDrawing}
            disabled={isDrawing}
            style={getButtonStyle(isDrawing)}
          >
            Start Drawing
          </button>

          <button
            onClick={stopDrawing}
            disabled={!isDrawing}
            style={getButtonStyle(!isDrawing)}
          >
            Save Drawing
          </button>

          <button
            onClick={() =>
              removePolygonById(polygons[polygons.length - 1]?.id || "")
            }
            disabled={polygons.length === 0}
            style={getButtonStyle(polygons.length === 0)}
          >
            Remove Last Polygon
          </button>

          <button
            onClick={removeSelectedPolygon}
            disabled={!selectedPolygonId || isDrawing}
            style={getButtonStyle(!selectedPolygonId || isDrawing)}
          >
            Remove Selected Polygon
          </button>

          <button
            onClick={editSelectedPolygon}
            disabled={(!selectedPolygonId || isDrawing || !!editingPolygon)}
            style={getButtonStyle(!selectedPolygonId || isDrawing || !!editingPolygon)}
          >
            Edit Polygon
          </button>
        </div>
      </div>

      {/* Right Section: Coordinates list */}
      <div
        style={{
          width: "25%",
          overflowY: "scroll",
          background: "#f9f9f9",
          padding: "10px",
          borderLeft: "1px solid #ddd",
          height: "100%",
        }}
      >
        <h4>Polygons</h4>
        {polygons.map((entity, index) => (
          <div
            key={index}
            style={{
              marginBottom: "10px",
              backgroundColor:
                entity.id === selectedPolygonId ? "#d3d3d3" : "transparent",
              padding: "4px",
              borderRadius: "4px",
            }}
            onClick={() => setSelectedPolygonId(entity.id)}
          >
            <strong>Polygon {index + 1}:</strong>
            <button
              onClick={() => removePolygonById(entity.id)}
              style={{
                marginLeft: "10px",
                backgroundColor: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
            <ul style={{ marginTop: "4px" }}>
              {entity.polygon?.hierarchy?.getValue().positions.map(
                (position: Cesium.Cartesian3, i: Key | null | undefined) => {
                  const cartographic = Cesium.Cartographic.fromCartesian(
                    position
                  );
                  return (
                    <li key={i}>
                      Lat:{" "}
                      {Cesium.Math.toDegrees(
                        cartographic.latitude
                      ).toFixed(6)}
                      , Lon:{" "}
                      {Cesium.Math.toDegrees(
                        cartographic.longitude
                      ).toFixed(6)}
                    </li>
                  );
                }
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

};

const distanceToLineSegment = (
  point: Cesium.Cartesian3,
  start: Cesium.Cartesian3,
  end: Cesium.Cartesian3
): number => {
  // Vector from start to end
  const startToEnd = Cesium.Cartesian3.subtract(
    end,
    start,
    new Cesium.Cartesian3()
  );
  // Vector from start to point
  const startToPoint = Cesium.Cartesian3.subtract(
    point,
    start,
    new Cesium.Cartesian3()
  );

  const segLengthSquared = Cesium.Cartesian3.dot(startToEnd, startToEnd);
  if (segLengthSquared === 0.0) {
    // start and end are the same point
    return Cesium.Cartesian3.distance(point, start);
  }

  // Projection “t” of startToPoint onto startToEnd
  const t = Cesium.Cartesian3.dot(startToPoint, startToEnd) / segLengthSquared;
  if (t <= 0.0) {
    // Closer to the 'start' vertex
    return Cesium.Cartesian3.distance(point, start);
  } else if (t >= 1.0) {
    // Closer to the 'end' vertex
    return Cesium.Cartesian3.distance(point, end);
  }

  // Project onto the segment
  const projection = Cesium.Cartesian3.multiplyByScalar(
    startToEnd,
    t,
    new Cesium.Cartesian3()
  );
  const projPoint = Cesium.Cartesian3.add(
    start,
    projection,
    new Cesium.Cartesian3()
  );

  return Cesium.Cartesian3.distance(point, projPoint);
};

const insertPositionBetweenClosestVertices = (
  positions: Cesium.Cartesian3[],
  newPosition: Cesium.Cartesian3
): Cesium.Cartesian3[] => {
  // If there is 0 or 1 vertex so far, just push
  if (positions.length < 2) {
    return [...positions, newPosition];
  }

  let closestIndex = -1;
  let minDistance = Number.POSITIVE_INFINITY;

  // For each segment [i, i+1], plus wrapping around [last, 0]
  // find the segment closest to newPosition
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = positions[(i + 1) % positions.length];

    const dist = distanceToLineSegment(newPosition, start, end);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  // Insert newPosition after the start of the closest segment
  const updatedPositions = [...positions];
  updatedPositions.splice(closestIndex + 1, 0, newPosition);
  return updatedPositions;
};

export default CesiumViewer;
