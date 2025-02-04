// components/CesiumViewer.tsx

import { useState, useEffect } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import Script from 'next/script';

class PolygonEntity {
  id: string;
  polygonGraphics: PolygonGraphics;

  constructor(id: string, polygonGraphics: PolygonGraphics) {
    this.id = id;
    this.polygonGraphics = polygonGraphics;
  }
}

interface PolygonGraphics {
  hierarchy?: {
    getValue: () => { positions: Cesium.Cartesian3[] };
  };
}

const CesiumViewer: React.FC = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const [positions, setPositions] = useState<Cesium.Cartesian3[]>([]);
  const [polygons, setPolygons] = useState<PolygonEntity[]>([]);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);

const init=()=>{
  
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

//   const potreeContainer = document.createElement("div");
// potreeContainer.id = "potreeContainer";
// potreeContainer.style.position = "absolute";
// potreeContainer.style.top = "0";
// potreeContainer.style.left = "0";
// potreeContainer.style.width = "100%";
// potreeContainer.style.height = "100%";
// document.body.appendChild(potreeContainer);

// if(!window.Potree){
//   console.log('potree not loaded');
// }
// // Initialize Potree viewer
// const potreeViewer = new window.Potree.Viewer(potreeContainer);
// potreeViewer.setEDLEnabled(true);
// potreeViewer.setFOV(60);
// potreeViewer.setPointBudget(1_000_000);

  cesiumViewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
        114.155577,
        22.298555,
        500.75941748137
    ),
    orientation: {
        heading: 0.059247196494562004,
        pitch: -1.2123477931244669,
        roll: 6.283171082717684
    },
    duration: 0,
});
// function syncCameras() {
//   const cesiumCamera = cesiumViewer.camera;
//   const potreeCamera = potreeViewer.scene.getActiveCamera();

//   // Copy position and orientation from Cesium to Potree
//   const position = cesiumCamera.position;
//   const direction = cesiumCamera.direction;

//   potreeCamera.position.set(position.x, position.y, position.z);
//   potreeCamera.lookAt(
//       position.x + direction.x,
//       position.y + direction.y,
//       position.z + direction.z
//   );

//   potreeViewer.render();
// }
// cesiumViewer.camera.changed.addEventListener(syncCameras);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Potree.loadPointCloud("models/potree.json5", "cloud", (e: { pointcloud: any; }) => {
// const pointCloud = e.pointcloud;
// potreeViewer.scene.addPointCloud(pointCloud);
// });

  return () => {
    cesiumViewer.destroy();
  };
}

  useEffect(() => {

    
  }, []);

  useEffect(() => {
    if (!viewer || !isDrawing) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // Add vertex to the polygon on LEFT_CLICK
    handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(movement.position);
      if (!ray) return;

      const position = viewer.scene.globe.pick(ray, viewer.scene);
      if (position) {
        setPositions((prev) => [...prev, position]);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Finish drawing the polygon on RIGHT_CLICK
    handler.setInputAction(() => {
      if (positions.length > 2) {
        const polygonGraphics = new Cesium.PolygonGraphics({
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: Cesium.Color.RED.withAlpha(0.5),
          outline: true,
          outlineColor: Cesium.Color.BLACK,
        });

        const newEntity = viewer.entities.add({ polygon: polygonGraphics });
        const id = newEntity.id;

        const polygonEntity = new PolygonEntity(id, {
          hierarchy: polygonGraphics.hierarchy as PolygonGraphics["hierarchy"],
        });

        setPolygons((prev) => [...prev, polygonEntity]);
        setPositions([]);
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [viewer, isDrawing, positions]);

  useEffect(() => {
    if (!viewer) return;

    const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    clickHandler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      const pickedObject = viewer.scene.pick(movement.position)?.id;
      if (pickedObject && pickedObject.id && pickedObject instanceof Cesium.Entity) {
        setSelectedPolygonId(pickedObject.id);
      }else{
        setSelectedPolygonId(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      clickHandler.destroy();
    };
  }, [viewer]);

  const startDrawing = () => {
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setPositions([]); // Clear unfinished polygon
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

  return (
    <div style={{ display: "flex", height: "100vh" }}>
       <Script
        src="/potree/build/potree/potree.js"
        strategy="lazyOnload"
        onLoad={() =>{

          init();
        }
        }
      />
      {/* Left Section: Cesium viewer and controls */}
      <div style={{ width: "75%", position: "relative" }}>
        <div id="cesiumContainer" style={{ width: "100%", height: "80%" }}></div>

        {/* Buttons container moved to the bottom */}
        <div style={{ position: "absolute", bottom: 10, left: 10, zIndex: 10 }}>
          <button onClick={startDrawing} disabled={isDrawing}>
            Start Drawing
          </button>
          <button onClick={stopDrawing} disabled={!isDrawing}>
            Stop Drawing
          </button>
          <button
            onClick={() => removePolygonById(polygons[polygons.length - 1]?.id || "")}
            disabled={polygons.length === 0}
          >
            Remove Last Polygon
          </button>
          <button onClick={removeSelectedPolygon} disabled={!selectedPolygonId}>
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
        {polygons.map((polygon, index) => (
          <div
            key={index}
            style={{
              marginBottom: "10px",
              backgroundColor: polygon.id === selectedPolygonId ? "#d3d3d3" : "transparent",
            }}
          >
            <strong>Polygon {index + 1}:</strong>
            <button
              onClick={() => removePolygonById(polygon.id)}
              style={{ marginLeft: "10px" }}
            >
              Remove
            </button>
            <ul>
              {polygon.polygonGraphics.hierarchy?.getValue().positions.map((position, i) => {
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
