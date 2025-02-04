namespace Potree {
    const PointSizeType = {
        FIXED: 0,
        ATTENUATED: 1,
        ADAPTIVE: 2
    };
    const PointShape = {
        SQUARE: 0,
        CIRCLE: 1,
        PARABOLOID: 2
    };

    class Viewer {
        scene: Scene;
        constructor(element: HTMLElement);

        setPointBudget(budget: number): void;
        loadPointCloud(path: string, name: string, callback?: (e: PointCloudEventVariable) => void): void;
        setEDLEnabled(enabled: boolean): void;
        setFOV(fov: number): void;
        setBackground(color: string): void;
        fitToScreen(): void;
        loadSettingsFromURL(): void;
        render(): void;
        zoomTo(any):void;
        update(a:number,b:number):void;
    }

    class PointCloudEventVariable {
        pointcloud: PointCloud;
    }
    class PointCloud {
        position: THREE.Vector3;
        scale: THREE.Vector3;
        material: PointCloudMaterial;
    }
    class Scene {
        getActiveCamera() :PerspectiveCamera;
        addPointCloud(pointcloud: PointCloud);
        view:View;
    }
    class View{
        lookAt(vector:THREE.Vector3) :void;
        position:Position;
    }
    class Position{
        set(x:double, y:double, z:double) :void;
    }
    class PerspectiveCamera {
             up: Three.PerspectiveCamera.up;
        lookAt(vector:THREE.Vector3 ) :void;
        position:any;
        getWorldDirection(target:THREE.Vector3) :THREE.Vector3;
        rotation:double;
        zoom:double;
        fov:number;
        aspect:number;
        matrixWorld:any;
    }
    class PointCloudMaterial {
        size: number;
        pointSizeType: PointSizeType;
        shape: PointShape;
    }
    function loadPointCloud(
        path: string,
        name: string,
        callback: (e: PointCloudEventVariable) => void
    ): void;
}