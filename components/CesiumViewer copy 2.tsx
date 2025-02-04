// components/CesiumViewer.tsx

import { useState, useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import Script from "next/script";
import dotImage from "./dot";

const CesiumViewer: React.FC = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const [positions, setPositions] = useState<Cesium.Cartesian3[]>([]);
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

    Cesium. Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmNzA1Mjg0ZC1lYjlhLTQ1MGUtODJkZS1jNDc1Y2Q0ODIxYmEiLCJpZCI6MjY2NDg5LCJpYXQiOjE3MzU4OTMyNTF9.YtvGGBuqmEg-bMXkCC7KIrrt4eYnKrwkUkm8EKAaJCg';
    const cesiumViewer = new Cesium.Viewer("cesiumContainer",{   
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

    // // Example Potree integration from your code
    // const potreeContainer = document.createElement("div");
    // potreeContainer.id = "potreeContainer";
    // potreeContainer.style.position = "absolute";
    // potreeContainer.style.top = "0";
    // potreeContainer.style.left = "0";
    // potreeContainer.style.width = "100%";
    // potreeContainer.style.height = "100%";
    // document.body.appendChild(potreeContainer);

    // if (!Potree) {
    //   console.log("Potree not loaded");
    // } else {
    //   // Initialize Potree viewer
    //   const potreeViewer = new window.Potree.Viewer(potreeContainer);
    //   potreeViewer.setEDLEnabled(true);
    //   potreeViewer.setFOV(60);
    //   potreeViewer.setPointBudget(1_000_000);

      cesiumViewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(114.155577, 22.298555, 500.75941748137),
        orientation: {
          heading: 0.059247196494562004,
          pitch: -1.2123477931244669,
          roll: 6.283171082717684,
        },
        duration: 0,
      });

      // function syncCameras() {
      //   const cesiumCamera = cesiumViewer.camera;
      //   const potreeCamera = potreeViewer.scene.getActiveCamera();

      //   const position = cesiumCamera.position;
      //   const direction = cesiumCamera.direction;

      //   // potreeCamera.position.set(...) expects 3 numeric args
      //   potreeCamera.position.set(position.x, position.y, position.z);
      //   potreeCamera.lookAt((
      //     position.x + direction.x,
      //     position.y + direction.y,
      //     position.z + direction.z
      //   ));
      //   potreeViewer.render();
      // }

      // cesiumViewer.camera.changed.addEventListener(syncCameras);

      // Load your pointcloud
      // window.Potree.loadPointCloud(
      //   "models/WKCDA_all.pcd",
      //   "cloud",
      //   (e: { pointcloud: any }) => {
      //     const pointCloud = e.pointcloud;
      //     potreeViewer.scene.addPointCloud(pointCloud);
      //   }
      // );
    // }

    return () => {
      cesiumViewer.destroy();
    };
  };

  /**
   * Updates the corner billboards for the selected polygon.
   * Clears existing billboards and adds new ones for each vertex in the polygon's hierarchy.
   */
  const updateCornerBillboards = () => {
    if (!viewer) return;

    // Remove old corner billboards
    cornerBillboardsRef.current.forEach((entity) => {
      viewer.entities.remove(entity);
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
          scale: 0.07,
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
    );;
  };

  /**
   * This effect updates corner billboards whenever:
   *   - The selected polygon changes
   *   - Polygons change
   *   - We finish drawing/editing
   */
  useEffect(() => {
    updateCornerBillboards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPolygonId, polygons, editingPolygon]);

  /**
   * Handle new polygon drawing (i.e., adding corners) 
   */
  useEffect(() => {
    if (!viewer || !isDrawing) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // LEFT_CLICK to add a vertex
    handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(movement.position);
      if (!ray) return;

      const position = viewer.scene.globe.pick(ray, viewer.scene);
      if (position) {
        const newPositions = [...positions, position];
        setPositions(newPositions);

        // Create or update the "editing" polygon
        const polygonGraphics = new Cesium.PolygonGraphics({
          hierarchy: new Cesium.PolygonHierarchy(newPositions),
          material: Cesium.Color.RED.withAlpha(0.5),
          outline: true,
          outlineColor: Cesium.Color.BLACK,
        });

        // If editing an existing polygon, remove it first
        if (selectedPolygonId) {
          viewer.entities.removeById(selectedPolygonId);
          setEditingPolygon(null);
        }

        // Add new polygon
        const addedPolygon = viewer.entities.add({
          polygon: polygonGraphics,
        });

        setSelectedPolygonId(addedPolygon.id);
        setEditingPolygon(addedPolygon);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Right-click or ESC to "finish" could be here, 
    // or you can add a separate event. 
    // (But you already have a "Save Drawing" button.)

    return () => {
      handler.destroy();
    };
  }, [viewer, isDrawing, positions, selectedPolygonId]);

  /**
   * This effect handles picking logic:
   *  - If we are NOT drawing, we can pick polygons or corner billboards
   *  - If we click on a corner billboard, begin dragging that corner
   *  - If we click on a polygon, select it
   *  - Otherwise, clear the selection
   */
  useEffect(() => {
    if (!viewer) return;

    const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // LEFT_DOWN to start drag if we picked a corner
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
        // Clicked on nothing
        setSelectedPolygonId(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    // LEFT_UP to end drag
    clickHandler.setInputAction(() => {
      if (isDraggingCorner) {
        setIsDraggingCorner(false);
        setDraggedCornerIndex(null);
        setDraggedCornerPolygonId(null);

        // Re-enable camera movement
        const ssc = viewer.scene.screenSpaceCameraController;
        ssc.enableRotate = true;
        ssc.enableTranslate = true;
        ssc.enableTilt = true;
        ssc.enableLook = true;
      }
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    return () => {
      clickHandler.destroy();
    };
  }, [viewer, isDrawing]);

  /**
   * This effect handles the actual corner "drag" motion: 
   * - On MOUSE_MOVE, if we are dragging a corner, update that corner’s position.
   */
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
        cornerBillboardsRef.current[draggedCornerIndex].position  = new Cesium.ConstantPositionProperty(newPosition);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

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

  /**
   * Start drawing: sets up "draw mode".
   */
  const startDrawing = () => {
    setIsDrawing(true);
  };

  /**
   * Stop drawing: finalize the polygon that was being "edited", 
   *  push it to 'polygons' array, reset everything for the next polygon.
   */
  const stopDrawing = () => {
    if (editingPolygon && viewer) {
      const newPolygon = new Cesium.PolygonGraphics({
        hierarchy: editingPolygon.polygon?.hierarchy?.getValue(),
        material: Cesium.Color.GREEN.withAlpha(0.5),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
      });

      // remove the "editing" polygon and add the finalized one
      viewer.entities.removeById(editingPolygon.id);
      const addedPolygon = viewer.entities.add({
        polygon: newPolygon,
      });

      setPolygons((prev) => [
        ...prev.filter((poly) => poly.id !== editingPolygon.id),
        addedPolygon,
      ]);
    }

    setIsDrawing(false);
    setPositions([]);
    setSelectedPolygonId(null);
    setEditingPolygon(null);
  };

  /**
   * Remove the given polygon from the scene
   */
  const removePolygonById = (id: string) => {
    if (viewer) {
      viewer.entities.removeById(id);
      setPolygons((prev) => prev.filter((polygon) => polygon.id !== id));
      if (selectedPolygonId === id) {
        setSelectedPolygonId(null);
      }
    }
  };

  /**
   * Remove the current selected polygon
   */
  const removeSelectedPolygon = () => {
    if (selectedPolygonId) {
      removePolygonById(selectedPolygonId);
      setSelectedPolygonId(null);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Scripts for jQuery, proj4, potree, etc. */}
      <Script src="/potree/libs/jquery/jquery.min.js" />
      <Script src="/potree/libs/proj4/proj4.js" />
      <Script src="/potree/libs/other/BinaryHeap.js" />
      <Script src="/potree/libs/tween/Tween.js" />
      <Script
        src="/potree/build/potree/potree.js"
        strategy="lazyOnload"
        onLoad={() => {
          init();
        }}
      />

      {/* Left Section: Cesium viewer and controls */}
      <div style={{ width: "75%", position: "relative" }}>
        <div id="cesiumContainer" style={{ width: "100%", height: "80%" }}></div>

        {/* Buttons container with Flexbox and spacing */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            zIndex: 10,
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={startDrawing}
            disabled={isDrawing}
            style={{
              padding: "6px 12px",
              fontSize: "14px",
              borderRadius: "4px",
              cursor: isDrawing ? "not-allowed" : "pointer",
            }}
          >
            Start Drawing
          </button>

          <button
            onClick={stopDrawing}
            disabled={!isDrawing}
            style={{
              padding: "6px 12px",
              fontSize: "14px",
              borderRadius: "4px",
              cursor: !isDrawing ? "not-allowed" : "pointer",
            }}
          >
            Save Drawing
          </button>

          <button
            onClick={() =>
              removePolygonById(polygons[polygons.length - 1]?.id || "")
            }
            disabled={polygons.length === 0}
            style={{
              padding: "6px 12px",
              fontSize: "14px",
              borderRadius: "4px",
              cursor: polygons.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Remove Last Polygon
          </button>

          <button
            onClick={removeSelectedPolygon}
            disabled={!selectedPolygonId}
            style={{
              padding: "6px 12px",
              fontSize: "14px",
              borderRadius: "4px",
              cursor: !selectedPolygonId ? "not-allowed" : "pointer",
            }}
          >
            Remove Selected Polygon
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
            }}
          >
            <strong>Polygon {index + 1}:</strong>
            <button onClick={() => removePolygonById(entity.id)} style={{ marginLeft: "10px" }}>
              Remove
            </button>
            <ul>
              {entity.polygon?.hierarchy
                ?.getValue()
                ?.positions?.map((position: Cesium.Cartesian3, i: number) => {
                  const cartographic = Cesium.Cartographic.fromCartesian(position);
                  return (
                    <li key={i}>
                      Lat: {Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)},
                      Lon: {Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CesiumViewer;
