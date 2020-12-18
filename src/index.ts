import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Space, Matrix } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRControllerComponent } from "@babylonjs/core/XR/motionController/webXRControllercomponent";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Logger } from "@babylonjs/core/Misc/logger";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import {MeshBuilder} from  "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { Ray } from "@babylonjs/core/Culling/ray";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";


import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader"



// Physics
import * as cannon from "cannon" 
import { CannonJSPlugin } from "@babylonjs/core/Physics/Plugins/cannonJSPlugin";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import "@babylonjs/core/Physics/physicsEngineComponent";

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";
import "@babylonjs/core/Materials/standardMaterial"
import "@babylonjs/loaders/OBJ/objFileLoader"
import "@babylonjs/loaders/glTF/2.0/glTFLoader"

class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    private selectedObject: AbstractMesh | null;
    private selectedRoot: TransformNode | null;
    private selectionTransform: TransformNode | null;


    private laserPointer: LinesMesh | null;
    private bimanualLine: LinesMesh | null;
    private miniatureObject: InstancedMesh | null;

    private balls: Mesh [];

    private previousLeftControllerPosition: Vector3;
    private previousRightControllerPosition: Vector3;
    
    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   

        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;
    
        this.selectedObject = null;
        this.selectionTransform = null;
        this.selectedRoot = null;
        
        this.laserPointer = null;
        this.bimanualLine = null;
        this.miniatureObject = null;

        this.balls = [];

        this.previousLeftControllerPosition = Vector3.Zero();
        this.previousRightControllerPosition = Vector3.Zero();

    }

    start() : void 
    {
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => { 
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
        // This creates and positions a first-person camera (non-mesh)
        var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
        camera.fov = 90 * Math.PI / 180;
        camera.minZ = .1;
        camera.maxZ = 100;

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

       // Create a point light
       var pointLight = new PointLight("pointLight", new Vector3(0, 2.5, 0), this.scene);
       pointLight.intensity = 1.0;
       pointLight.diffuse = new Color3(.25, .25, .25);

        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 50
        });

        // Make sure the environment and skybox is not pickable!
        environment!.ground!.isPickable = false;
        environment!.ground!.position.y = -1;
        environment!.skybox!.isPickable = false;

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation and pointer selection
        xrHelper.teleportation.dispose();
        xrHelper.pointerSelection.dispose();

        // Create points for the laser pointer
        var laserPoints = [];
        laserPoints.push(new Vector3(0, 0, 0));
        laserPoints.push(new Vector3(0, 0, 10));

        // Create a laser pointer and make sure it is not pickable
        this.laserPointer = MeshBuilder.CreateLines("laserPointer", {points: laserPoints}, this.scene);
        this.laserPointer.color = Color3.Blue();
        this.laserPointer.alpha = .5;
        this.laserPointer.visibility = 0;
        this.laserPointer.isPickable = false;

        // Create points for the bimanual line
        var bimanualPoints = [];
        bimanualPoints.push(new Vector3(0, 0, 0));
        bimanualPoints.push(new Vector3(0, 0, 1));

       // Create a dashed line between the two controllers
        this.bimanualLine = MeshBuilder.CreateDashedLines("bimanualLine", {points: bimanualPoints}, this.scene);
        this.bimanualLine.color = Color3.Gray();
        this.bimanualLine.alpha = .5;
        this.bimanualLine.visibility = 0;
        this.bimanualLine.isPickable = false;

        // This transform will be used to attach objects to the laser pointer
        this.selectionTransform = new TransformNode("selectionTransform", this.scene);
        this.selectionTransform.parent = this.laserPointer;

        // Attach the laser pointer to the right controller when it is connected
        xrHelper.input.onControllerAddedObservable.add((inputSource) => {
            if(inputSource.uniqueId.endsWith("right"))
            {
                this.rightController = inputSource;
                this.laserPointer!.parent = this.rightController.pointer;
                this.laserPointer!.visibility = 1;
            }
            else 
            {
                this.leftController = inputSource;
            }  
        });

        // Don't forget to deparent the laser pointer or it will be destroyed!
        xrHelper.input.onControllerRemovedObservable.add((inputSource) => {

            if(inputSource.uniqueId.endsWith("right")) 
            {
                this.laserPointer!.parent = null;
                this.laserPointer!.visibility = 0;
            }
        });

        // Enable physics engine with no gravity
        this.scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin(undefined, undefined, cannon));








        SceneLoader.ImportMesh("", "assets/models/", "driver.obj", this.scene, (meshes) => {
            meshes[0].name = "driver";
            meshes[0].scaling = new Vector3(-.001, .001, .001);
            //meshes[0].rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            meshes[0].position = new Vector3(-.8,-.3,-.03);

            var root = new TransformNode("driver-root", this.scene);
            root.position = new Vector3(0,0,0);

            meshes[0].parent = root;
            root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            root.position = new Vector3(0,0,0);



            //meshes[0].position = new Vector3(.659,-.57,.022);
            //meshes[0].setPivotMatrix(Matrix.Translation(-.03,.6,.6));
            //meshes[0].setPivotMatrix(Matrix.Translation(-.6,0,-.8));

            //meshes[0].position = new Vector3(0,2,2);
            //meshes[0].physicsImpostor = new PhysicsImpostor(meshes[0], PhysicsImpostor.SphereImpostor, {mass: 1,restitution:.9}, this.scene);

        });
        SceneLoader.ImportMesh("", "assets/models/", "iron.obj", this.scene, (meshes) => {
            meshes[0].name = "iron";
            meshes[0].scaling = new Vector3(-.001, .001, .001);
            //meshes[0].rotation = new Vector3(0, Math.PI, 13.6 * Math.PI/180);
            meshes[0].position = new Vector3(-.5,-.4,.0);
            var root = new TransformNode("iron-root", this.scene);
            root.position = new Vector3(0,0,0);

            meshes[0].parent = root;
            root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            root.position = new Vector3(0,0,0);
            //meshes[0].physicsImpostor = new PhysicsImpostor(meshes[0], PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);


        });
        SceneLoader.ImportMesh("", "assets/models/", "putter.obj", this.scene, (meshes) => {
            meshes[0].name = "putter";
            meshes[0].scaling = new Vector3(-.001, .001, .001);
            ///meshes[0].rotation = new Vector3(0, Math.PI, 13.6 * Math.PI/180);
            meshes[0].position = new Vector3(-1.34,-.4,.0);
            var root = new TransformNode("putter-root", this.scene);
            root.position = new Vector3(0,0,0);

            meshes[0].parent = root;
            root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            root.position = new Vector3(0,0,0);
            //meshes[0].physicsImpostor = new PhysicsImpostor(meshes[0], PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);


        });
 
        var ball = MeshBuilder.CreateSphere("ball", {segments:15, diameter:.2}, this.scene);
        ball.position = new Vector3(0,0,0);
        var root = new TransformNode("putter-root", this.scene);
        root.position = new Vector3(0,0,0);

        ball.parent = root;
        //root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
        root.position = new Vector3(0,0,0);
        //ball.physicsImpostor = new PhysicsImpostor(ball, PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);
        
        var fairway = MeshBuilder.CreateGround("fairway", {width:20, height:50}, this.scene);
        fairway.position = new Vector3(0,0,5);
        //fairway.rotation = new Vector3(90*Math.PI/180, 0,0);
        fairway.isPickable = false;
        fairway.physicsImpostor = new PhysicsImpostor(fairway, PhysicsImpostor.BoxImpostor, {mass:0 , restitution:.9}, this.scene);


        
        
        this.scene.debugLayer.show(); 
    }

    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
        if(this.leftController && this.rightController)
        {
            // Update bimanual line position and rotation
            this.bimanualLine!.position = this.leftController.grip!.position;
            this.bimanualLine!.lookAt(this.rightController.grip!.position);

            // Update bimanual line scale
            this.bimanualLine!.scaling.z = this.rightController.grip!.position.subtract(this.leftController.grip!.position).length();
        }

        // Polling for controller input
        this.processControllerInput();  

        // Update the previous controller positions for next frame
        if(this.rightController)
        {
            this.previousRightControllerPosition = this.rightController.grip!.position.clone();
        }
        if(this.leftController)
        {
            this.previousLeftControllerPosition = this.leftController.grip!.position.clone();
        }

    }

    // Process event handlers for controller input
    private processControllerInput()
    {
        this.onRightTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
        this.onRightThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));
        this.onRightSqueeze(this.rightController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onLeftSqueeze(this.leftController?.motionController?.getComponent("xr-standard-squeeze"));
    }

    private onRightTrigger(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                this.laserPointer!.color = Color3.Green();

                var ray = new Ray(this.rightController!.pointer.position, this.rightController!.pointer.forward, 10);
                var pickInfo = this.scene.pickWithRay(ray);

                // Deselect the currently selected object 
                if(this.selectedObject)
                {
                    this.selectedObject.disableEdgesRendering();
                    this.selectedObject = null;
                    this.selectedRoot = null;
                }

                // If an object was hit, select it
                if(pickInfo?.hit)
                {
                    this.selectedObject = pickInfo!.pickedMesh;
                    this.selectedRoot = <TransformNode>pickInfo!.pickedMesh?.parent;
                    this.selectedObject!.enableEdgesRendering();
                    //this.selectedRoot!.position = this.rightController!.pointer!.position;
                    this.selectedRoot!.position = new Vector3(0,0,0);
                    this.selectedRoot!.parent = this.rightController!.grip!;

                    // Parent the object to the transform on the laser pointer
                    //this.selectionTransform!.position = new Vector3(0, 0, pickInfo.distance);
                    //this.selectedRoot!.setParent(this.selectionTransform!);
                }
            }
            else
            {
                // Reset the laser pointer color
                this.laserPointer!.color = Color3.Blue();

                // Release the object from the laser pointer
                if(this.selectedObject)
                {
                    this.selectedRoot!.setParent(null);
                }  
            }
        }
    }

    private onRightThumbstick(component?: WebXRControllerComponent)
    {
        // If we have an object that is currently attached to the laser pointer
        if(component?.changes.axes && this.selectedObject && this.selectedObject.parent)
        {
            // Use delta time to calculate the proper speed
            var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

            // Translate the object along the depth ray in world space
            this.selectedObject.translate(this.laserPointer!.forward, moveDistance, Space.WORLD);
        }
    }

    private onRightSqueeze(component?: WebXRControllerComponent)
    {
        if(this.selectedObject && this.leftController)
        {
            if(component?.changes.pressed)
            {
                // Button down
                if(component?.pressed)
                {
                    this.bimanualLine!.visibility = 1;
                    this.miniatureObject = new InstancedMesh('miniatureObject', <Mesh>this.selectedObject);
                }
                // Button release
                else
                {
                    this.bimanualLine!.visibility = 0;
                    this.miniatureObject?.dispose();
                }
            }

            if(component?.pressed)
            {
                // Position manipulation
                var midpoint = this.rightController!.grip!.position.add(this.leftController.grip!.position).scale(.5);
                var previousMidpoint = this.previousRightControllerPosition.add(this.previousLeftControllerPosition).scale(.5);
                var positionChange = midpoint.subtract(previousMidpoint);
                this.selectedObject.translate(positionChange!.normalizeToNew(), positionChange.length(), Space.WORLD);

                // Rotation manipulation
                var bimanualVector = this.rightController!.grip!.position.subtract(this.leftController!.grip!.position).normalize();
                var previousBimanualVector = this.previousRightControllerPosition.subtract(this.previousLeftControllerPosition).normalize();

                // Some linear algebra to calculate the angle and axis of rotation
                var angle = Math.acos(Vector3.Dot(previousBimanualVector, bimanualVector));
                var axis = Vector3.Cross(previousBimanualVector, bimanualVector).normalize();
                this.selectedObject.rotate(axis, angle, Space.WORLD);

                // Update the position, orientation, and scale of the miniature object
                this.miniatureObject!.position = midpoint;
                this.miniatureObject!.rotationQuaternion = this.selectedObject.absoluteRotationQuaternion;
                this.miniatureObject!.scaling = this.selectedObject.scaling.scale(.1);
            }
        }
    }

    private onLeftSqueeze(component?: WebXRControllerComponent)
    {
        // Only add scale manipulation if the right squeeze button is already being pressed
        if(component?.pressed && this.selectedObject &&
            this.rightController?.motionController?.getComponent("xr-standard-squeeze").pressed)
        {
            // Scale manipulation
            var bimanualVector = this.rightController!.grip!.position.subtract(this.leftController!.grip!.position);
            var previousBimanualVector = this.previousRightControllerPosition.subtract(this.previousLeftControllerPosition);
            var scaleFactor = bimanualVector.length() / previousBimanualVector.length();
            this.selectedObject.scaling = this.selectedObject.scaling.scale(scaleFactor);
        }
    }

}
/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();