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
import { Axis } from "@babylonjs/core/Maths/math.axis";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"


import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader"

import { PointerEventTypes, PointerInfo } from "@babylonjs/core/Events/pointerEvents";

import { PickingInfo } from "@babylonjs/core/Collisions";


import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture"
import { VirtualKeyboard } from "@babylonjs/gui/2D/controls/virtualKeyboard" 
import { InputText } from "@babylonjs/gui/2D/controls/inputText" 
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock"
import { RadioButton } from "@babylonjs/gui/2D/controls/radioButton"
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel"
import { Control } from "@babylonjs/gui/2D/controls/control"
import { GUI3DManager } from "@babylonjs/gui/3D/gui3DManager"
import { Button3D } from "@babylonjs/gui/3D"




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
import { ActionManager } from "@babylonjs/core/Actions/actionManager";
import { GroundBuilder, SetValueAction, Texture, VertexOutputBlock } from "@babylonjs/core";

class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    private selectedObject: AbstractMesh | null;
    private selectedRoot: Mesh | null;
    private selectionTransform: TransformNode | null;


    private laserPointer: LinesMesh | null;
    private bimanualLine: LinesMesh | null;
    private miniatureObject: InstancedMesh | null;

    private clubs: Array<Mesh>;
    private clubsimposters: Array<Mesh>;
    private balls: Array<Mesh>;
    private ballsImposters: Array<PhysicsImpostor>
    private bags: Array<Mesh>;
    private buttons: Array<Button3D>;

    private pickInfo: PickingInfo | null;

    private previousLeftControllerPosition: Vector3;
    private previousRightControllerPosition: Vector3;

    private count : number;
    private carts : Array<Mesh>;

    private steeringBalls: Array<Mesh>;

    private inDrive: boolean;
    private inPass: boolean;
    
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

        this.clubs = [];
        this.clubsimposters = []
        this.balls = [];
        this.ballsImposters = [];
        this.bags = [];
        this.buttons = [];
        this.carts = [];
        this.steeringBalls = [];

        this.pickInfo = null;

        this.previousLeftControllerPosition = Vector3.Zero();
        this.previousRightControllerPosition = Vector3.Zero();

        this.count = 0;

        this.inDrive = false;
        this.inPass = false;

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
        camera.maxZ = 500;
        

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

       // Create a point light
       var pointLight = new PointLight("pointLight", new Vector3(0, 2.5, 0), this.scene);
       pointLight.intensity = 1.0;
       pointLight.diffuse = new Color3(.25, .25, .25);

       var ambientlight = new HemisphericLight("ambient", Vector3.Up(), this.scene);
        ambientlight.intensity = 1.0;
        ambientlight.diffuse = new Color3(.25, .25, .25);
        // Add a directional light to imitate sunlight
        var directionalLight = new DirectionalLight("sunlight", Vector3.Down(), this.scene);
        directionalLight.intensity = 1.0;

        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: false,
            createSkybox: false
            //groundSize: 200
        });

        this.scene.enablePhysics(new Vector3(0, -9.81, .0), new CannonJSPlugin(undefined, undefined, cannon));


        // Make sure the environment and skybox is not pickable!
        //environment!.ground!.isPickable = false;
        //environment!.ground!.position.y = -1;
        //environment!.skybox!.isPickable = false;

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({
            //floorMeshes: [fairway]
        });


        xrHelper.teleportation.setSelectionFeature(xrHelper.baseExperience.featuresManager.getEnabledFeature("xr-background-remover"));


        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation and pointer selection
        //xrHelper.teleportation.dispose();
        //xrHelper.pointerSelection.dispose();

        this.scene.onPointerObservable.add((pointerInfo) => {
            this.processPointer(pointerInfo);
        });

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



        this.scene.collisionsEnabled = true;

        var manager = new GUI3DManager(this.scene);

        // golf clubs come from https://free3d.com/3d-model/golf-clubs-82208.html


        /*SceneLoader.ImportMesh("", "assets/models/", "driver.obj", this.scene, (meshes) => {
            meshes[0].name = "driver";
            meshes[0].scaling = new Vector3(-.001, .001, .001);
            //meshes[0].rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            meshes[0].position = new Vector3(-.8,-.3,-.03);

            var root = MeshBuilder.CreateSphere("driver-root", {diameter:.5, segments : 5} ,this.scene);
            root.position = new Vector3(0,0,0);

            var head = MeshBuilder.CreateBox("driver head", {size:.15}, this.scene)

            head.parent = root;
            head.position = new Vector3(.63,-.85,-.058);
            head.isPickable = false;
            head.isVisible = false;
            head.physicsImpostor = new PhysicsImpostor(head, PhysicsImpostor.BoxImpostor, {mass:1}, this.scene);

            meshes[0].parent = root;
            root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            root.position = new Vector3(2,2,1);



            //meshes[0].position = new Vector3(.659,-.57,.022);
            //meshes[0].setPivotMatrix(Matrix.Translation(-.03,.6,.6));
            //meshes[0].setPivotMatrix(Matrix.Translation(-.6,0,-.8));

            //meshes[0].position = new Vector3(0,2,2);
            meshes[0].physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.SphereImpostor, {mass: 1,restitution:.9}, this.scene);

            root.isVisible = false;
            root.isPickable = false;

            //head.physicsImpostor.registerOnPhysicsCollide(this.ballsImposters, this.clubToBall);
            meshes[0].physicsImpostor.sleep();

            meshes[0].checkCollisions = true;

            this.clubs.push(<Mesh>meshes[0]);
            this.clubsimposters.push(head);


        });*/

        /*
        SceneLoader.ImportMesh("", "assets/models/", "iron.obj", this.scene, (meshes) => {
            meshes[0].name = "iron";
            meshes[0].scaling = new Vector3(-.001, .001, .001);
            //meshes[0].rotation = new Vector3(0, Math.PI, 13.6 * Math.PI/180);
            meshes[0].position = new Vector3(-.5,-.4,.0);
            var root = MeshBuilder.CreateSphere("iron-root", {diameter:.5, segments : 5} ,this.scene);
            root.position = new Vector3(0,0,0);

            var head = MeshBuilder.CreateBox("iron head", {size:.15}, this.scene)

            head.parent = root;
            head.position = new Vector3(.62,-.942,-.058);
            head.rotate(new Vector3(1,0,0), 54*Math.PI/180);
            head.isPickable = false;
            head.isVisible = false;
            head.physicsImpostor = new PhysicsImpostor(head, PhysicsImpostor.BoxImpostor, {mass:1}, this.scene);

            meshes[0].parent = root;
            root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            root.position = new Vector3(1,4,6);

            meshes[0].physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);
            meshes[0].physicsImpostor.sleep();

            root.isVisible = false;
            root.isPickable = false;

            meshes[0].checkCollisions = true;


            this.clubs.push(<Mesh>meshes[0]);
            this.clubsimposters.push(head);

        });
        */

        /*
        SceneLoader.ImportMesh("", "assets/models/", "putter.obj", this.scene, (meshes) => {
            meshes[0].name = "putter";
            meshes[0].scaling = new Vector3(-.001, .001, .001);
            ///meshes[0].rotation = new Vector3(0, Math.PI, 13.6 * Math.PI/180);
            meshes[0].position = new Vector3(-1.34,-.4,.0);
            var root = MeshBuilder.CreateSphere("putter-root", {diameter:.5, segments : 5} ,this.scene);
            root.position = new Vector3(0,0,0);

            var head = MeshBuilder.CreateBox("putter head", {size:.15}, this.scene)

            head.parent = root;
            head.position = new Vector3(.4,-.912,-.058);
            head.isPickable = false;
            head.isVisible = false;
            head.physicsImpostor = new PhysicsImpostor(head, PhysicsImpostor.BoxImpostor, {mass:1}, this.scene);

            meshes[0].parent = root;
            root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            root.position = new Vector3(1,2,0);
            meshes[0].physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);
            //meshes[0].physicsImpostor.physicsBody.shapes.radius = 3;
            root.isVisible = false;
            root.isPickable = false;

            meshes[0].physicsImpostor.sleep();
            this.clubs.push(<Mesh>meshes[0]);
            this.clubsimposters.push(head);

        });
        */


        //golfbag ripped from https://free3d.com/3d-model/golf-bag-v01--653547.html
        SceneLoader.ImportMesh("", "assets/models/", "10506_golf_bag_v01_L3.obj", this.scene, (meshes) => {
            meshes[0].name = "golfbag";
            meshes[0].scaling = new Vector3(-.01, .01, .01);
            meshes[0].rotation = new Vector3(90*Math.PI/180, 0,0);
            meshes[0].position = new Vector3(-0,0.5,0);
            var root = MeshBuilder.CreateBox("golfbag-root", {size:1} ,this.scene);
            root.position = new Vector3(-0,0,0);

            meshes[0].parent = root;
            //root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            root.position = new Vector3(-5,1,25);
            meshes[0].physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);
            root.isVisible = false;
            root.isPickable = false;

            meshes[0].physicsImpostor?.sleep();
            this.bags.push(<Mesh>meshes[0]);
            //.clubsimposters.push(head);

            //add 4 buttons and push them onto the buttons array
            var button1 = new Button3D('Golfball button');
            var button2 = new Button3D("Driver button");
            var button3 = new Button3D("Iron button");
            var button4 = new Button3D("Putter button");

            manager.addControl(button1);
            manager.addControl(button2);
            manager.addControl(button3);
            manager.addControl(button4);
            button1.linkToTransformNode(meshes[0]);
            button2.linkToTransformNode(meshes[0]);
            button3.linkToTransformNode(meshes[0]);
            button4.linkToTransformNode(meshes[0]);
            button1.position = new Vector3(-15, -35, 40);
            button2.position = new Vector3(-15, 35, 15);
            button3.position = new Vector3(-15, 35, 40);
            button4.position = new Vector3(-15, 35, 65);

            button1.mesh!.rotation = new Vector3(0,90*Math.PI/180, 270*Math.PI/180);
            button2.mesh!.rotation = new Vector3(0,90*Math.PI/180, 270*Math.PI/180);
            button3.mesh!.rotation = new Vector3(0,90*Math.PI/180, 270*Math.PI/180);
            button4.mesh!.rotation = new Vector3(0,90*Math.PI/180, 270*Math.PI/180);

            button1.scaling = new Vector3(-20,20,20);
            button2.scaling = new Vector3(-20,20,20);
            button3.scaling = new Vector3(-20,20,20);
            button4.scaling = new Vector3(-20,20,20);

            button1.onPointerUpObservable.add(()=>{
                var ball = MeshBuilder.CreateSphere("ball", {segments:15, diameter:.2}, this.scene);
                ball.position = new Vector3(0,0,0);
                var root = MeshBuilder.CreateSphere("ball-root", {diameter: .2, segments:15} ,this.scene);
                root.position = new Vector3(0,0,0);
                root.isPickable = false;
                root.isVisible = false;

                var balltex = new Texture("assets/textures/golfball.png", this.scene);
                var ballmat = new StandardMaterial("ballMaterial", this.scene);
                ballmat.diffuseTexture = balltex;
                ball.material = ballmat;

                ball.parent = root;
                //root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
                root.position = button1!.parent!.position!.add(new Vector3(0,1,0));
                ball.physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);


                ball.checkCollisions = true;

                //ball.physicsImpostor.sleep();

                this.balls.push(ball);
            });  
            button2.onPointerUpObservable.add( () => {

                SceneLoader.ImportMesh("", "assets/models/", "driver.obj", this.scene, (meshes) => {
                meshes[0].name = "driver";
                meshes[0].scaling = new Vector3(-.001, .001, .001);
                //meshes[0].rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
                meshes[0].position = new Vector3(-.8,-.3,-.03);

                var root = MeshBuilder.CreateSphere("driver-root", {diameter:.5, segments : 5} ,this.scene);
                root.position = new Vector3(0,0,0);

                var head = MeshBuilder.CreateBox("driver head", {size:.15}, this.scene)

                head.parent = root;
                head.position = new Vector3(.63,-.85,-.058);
                head.isPickable = false;
                head.isVisible = false;
                head.physicsImpostor = new PhysicsImpostor(head, PhysicsImpostor.BoxImpostor, {mass:1}, this.scene);

                meshes[0].parent = root;
                root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
                root.position = button2!.parent!.position!.add(new Vector3(0,1,0));

                var clubtex = new Texture("assets/textures/club.png", this.scene);
                var clubmat = new StandardMaterial("clubMaterial", this.scene);
                clubmat.diffuseTexture = clubtex;
                meshes[0].material = clubmat;


                //meshes[0].position = new Vector3(.659,-.57,.022);
                //meshes[0].setPivotMatrix(Matrix.Translation(-.03,.6,.6));
                //meshes[0].setPivotMatrix(Matrix.Translation(-.6,0,-.8));

                //meshes[0].position = new Vector3(0,2,2);
                meshes[0].physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.SphereImpostor, {mass: 1,restitution:.9}, this.scene);

                root.isVisible = false;
                root.isPickable = false;

                //head.physicsImpostor.registerOnPhysicsCollide(this.ballsImposters, this.clubToBall);
                //meshes[0].physicsImpostor.sleep();

                meshes[0].checkCollisions = true;

                this.clubs.push(<Mesh>meshes[0]);
                this.clubsimposters.push(head);


                });

            });  

            button3.onPointerUpObservable.add(()=>{
                SceneLoader.ImportMesh("", "assets/models/", "iron.obj", this.scene, (meshes) => {
                    meshes[0].name = "iron";
                    meshes[0].scaling = new Vector3(-.001, .001, .001);
                    //meshes[0].rotation = new Vector3(0, Math.PI, 13.6 * Math.PI/180);
                    meshes[0].position = new Vector3(-.5,-.4,.0);
                    var root = MeshBuilder.CreateSphere("iron-root", {diameter:.5, segments : 5} ,this.scene);
                    root.position = new Vector3(0,0,0);

                    var head = MeshBuilder.CreateBox("iron head", {size:.15}, this.scene)

                    head.parent = root;
                    head.position = new Vector3(.62,-.942,-.058);
                    head.rotate(new Vector3(1,0,0), 54*Math.PI/180);
                    head.isPickable = false;
                    head.isVisible = false;
                    head.physicsImpostor = new PhysicsImpostor(head, PhysicsImpostor.BoxImpostor, {mass:1}, this.scene);

                    meshes[0].parent = root;
                    root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
                    root.position = button3!.parent!.position!.add(new Vector3(0,1,0));

                    var clubtex = new Texture("assets/textures/club.png", this.scene);
                    var clubmat = new StandardMaterial("clubMaterial", this.scene);
                    clubmat.diffuseTexture = clubtex;
                    meshes[0].material = clubmat;

                    meshes[0].physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);
                    meshes[0].physicsImpostor.sleep();

                    root.isVisible = false;
                    root.isPickable = false;

                    meshes[0].checkCollisions = true;


                    this.clubs.push(<Mesh>meshes[0]);
                    this.clubsimposters.push(head);

                });
            });  
            button4.onPointerUpObservable.add(()=>{
                SceneLoader.ImportMesh("", "assets/models/", "putter.obj", this.scene, (meshes) => {
                    meshes[0].name = "putter";
                    meshes[0].scaling = new Vector3(-.001, .001, .001);
                    ///meshes[0].rotation = new Vector3(0, Math.PI, 13.6 * Math.PI/180);
                    meshes[0].position = new Vector3(-1.34,-.4,.0);
                    var root = MeshBuilder.CreateSphere("putter-root", {diameter:.5, segments : 5} ,this.scene);
                    root.position = new Vector3(0,0,0);

                    var head = MeshBuilder.CreateBox("putter head", {size:.15}, this.scene)

                    head.parent = root;
                    head.position = new Vector3(.4,-.912,-.058);
                    head.isPickable = false;
                    head.isVisible = false;
                    head.physicsImpostor = new PhysicsImpostor(head, PhysicsImpostor.BoxImpostor, {mass:1}, this.scene);

                    meshes[0].parent = root;
                    root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
                    root.position = button2!.parent!.position!.add(new Vector3(0,1,0));

                    var clubtex = new Texture("assets/textures/club.png", this.scene);
                    var clubmat = new StandardMaterial("clubMaterial", this.scene);
                    clubmat.diffuseTexture = clubtex;
                    meshes[0].material = clubmat;

                    meshes[0].physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);
                    //meshes[0].physicsImpostor.physicsBody.shapes.radius = 3;
                    root.isVisible = false;
                    root.isPickable = false;

                    //meshes[0].physicsImpostor.sleep();
                    this.clubs.push(<Mesh>meshes[0]);
                    this.clubsimposters.push(head);

                });
            });  

            var text1 = new TextBlock();
            text1.text = 'Golfball';
            text1.color = 'white';
            text1.fontSize = 40;
            button1.content = text1;

            var text2 = new TextBlock();
            text2.text = 'Driver';
            text2.color = 'white';
            text2.fontSize = 40;
            button2.content = text2;  

            var text3 = new TextBlock();
            text3.text = 'Iron';
            text3.color = 'white';
            text3.fontSize = 40;
            button3.content = text3;

            var text4 = new TextBlock();
            text4.text = 'Putter';
            text4.color = 'white';
            text4.fontSize = 40;
            button4.content = text4;

            this.buttons.push(button1);
            this.buttons.push(button2);
            this.buttons.push(button3);
            this.buttons.push(button4);


            
        

            // the items matching a golf bag and 1 after will always be these two buttons
            // they wont be toggled until selected by the right hand

        });


        // now we shall make the golf cart......
        // golf cart ripped from https://www.cgtrader.com/free-3d-models/vehicle/other/golf-cart--4

        
        SceneLoader.ImportMesh("", "assets/models/", "golfcart.obj", this.scene, (meshes) => {
        var root = MeshBuilder.CreateBox("golfcart-root", {depth: 4, width:2, height: 2.75} ,this.scene);
        //root.physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.BoxImpostor, {mass: 1}, this.scene);
        root.position = new Vector3(0,1.40);
        root.isPickable = false;
            
            for (var i = 0; i < meshes.length; i++){
                meshes[i].name = "golfcart";
                meshes[i].scaling = new Vector3(.05, .05, .05);
                meshes[i].physicsImpostor?.dispose();
                ///meshes[0].rotation = new Vector3(0, Math.PI, 13.6 * Math.PI/180);
                meshes[i].setParent(root);
                meshes[i].isPickable = false;
            }


            //root.physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.BoxImpostor, {mass: 1}, this.scene);
            //meshes[0].physicsImpostor.physicsBody.shapes.radius = 3;
            //meshes[0].physicsImpostor.sleep();

            //root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
            root.position = new Vector3(7,1.5,25);
            root.rotation.y = 180*Math.PI/180;
            root.isVisible = false;
            root.isPickable = false;

            var button1 = new Button3D('leftBag');
            var button2 = new Button3D("rightBag");
            var button3 = new Button3D("Driver");
            var button4 = new Button3D("Passenger");

            manager.addControl(button1);
            manager.addControl(button2);
            manager.addControl(button3);
            manager.addControl(button4);
            button1.linkToTransformNode(root);
            button2.linkToTransformNode(root);
            button3.linkToTransformNode(root);
            button4.linkToTransformNode(root);

            button1.position = new Vector3(-.5, -.45, -1.5);
            button2.position = new Vector3(.5, -.45, -1.5);
            button3.position = new Vector3(.49, -.15, -.94);
            button4.position = new Vector3(-.44, -.15, -.94);

            button1.mesh!.rotation = new Vector3(90*Math.PI/180,0,0);
            button2.mesh!.rotation = new Vector3(90*Math.PI/180,0,0);
            button3.mesh!.rotation = new Vector3(90*Math.PI/180,0,0);
            button4.mesh!.rotation = new Vector3(90*Math.PI/180,0,0);

            button1.scaling = new Vector3(.5,.5,.5);
            button2.scaling = new Vector3(.5,.5,.5);
            button3.scaling = new Vector3(.5,.5,.5);
            button4.scaling = new Vector3(.5,.5,.5);


            button1.onPointerUpObservable.add(()=>{
                console.log('Put it in the Left');
                this.bags[0].parent = this.carts[0];
                this.bags[0].position = (new Vector3(-.5, .75,-1.6));
                this.bags[0].rotation.y = 90 * Math.PI/180;
            }); 
            button2.onPointerUpObservable.add(()=>{
                console.log('Put it in the Right');
                this.bags[0].parent = this.carts[0];
                this.bags[0].position = (new Vector3(.5, .75,-1.6));
                this.bags[0].rotation.y = 90 * Math.PI/180;
            }); 
            button3.onPointerUpObservable.add(()=>{
                console.log('let me drive');
                this.inDrive = !this.inDrive;
                this.inPass = false;
            }); 
            button4.onPointerUpObservable.add(()=>{
                console.log('Im lazy');
                this.inPass = !this.inPass;
                this.inDrive = false;
            }); 

            var text1 = new TextBlock();
            text1.text = 'Left GolfBag';
            text1.color = 'black';
            text1.fontSize = 40;
            button1.content = text1;

            var text2 = new TextBlock();
            text2.text = 'Right GolfBag';
            text2.color = 'black';
            text2.fontSize = 40;
            button2.content = text2;  

            var text3 = new TextBlock();
            text3.text = 'Driver';
            text3.color = 'black';
            text3.fontSize = 40;
            button3.content = text3;

            var text4 = new TextBlock();
            text4.text = 'Passenger';
            text4.color = 'black';
            text4.fontSize = 40;
            button4.content = text4;

            this.buttons.push(button1);//4
            this.buttons.push(button2);//5
            this.buttons.push(button3);//6
            this.buttons.push(button4);//7

            




            //the difference in position with these balls will indicate forward, back, left rotate, right rotate

            // there will be a generous clearance to actually trigger a movement because.... yea.

            this.carts.push(root);


            // will be 2 balls... one will be fixed to the center of the steering wheel while the other can be dragged around
            var steeringball = MeshBuilder.CreateSphere("steering ball", {segments : 20, diameter:.1}, this.scene);
            steeringball.position = new Vector3 (0,0,0);
            steeringball.parent = this.carts[0];
            steeringball.position = new Vector3(.455,.248,.491);
            steeringball.isPickable = false;
            var rootball = MeshBuilder.CreateSphere("root ball", {segments : 20, diameter:.1}, this.scene);
            rootball.position = new Vector3 (0,0,0);
            rootball.parent = this.carts[0];
            rootball.position = new Vector3(.455,.248,.491);
            rootball.isPickable = false;
            var forwardball = MeshBuilder.CreateSphere("forward ball", {segments : 20, diameter:.1}, this.scene);
            forwardball.position = new Vector3 (0,0,0);
            forwardball.parent = this.carts[0];
            forwardball.position = new Vector3(0,0,.05);
            forwardball.isPickable = false;
            this.steeringBalls.push(rootball);
            this.steeringBalls.push(steeringball);
            this.steeringBalls.push(forwardball);

        });

        //make the driving mechanic
            



        /*
        var ball = MeshBuilder.CreateSphere("ball", {segments:15, diameter:.2}, this.scene);
        ball.position = new Vector3(0,0,0);
        var root = MeshBuilder.CreateSphere("ball-root", {diameter: .2, segments:15} ,this.scene);
        root.position = new Vector3(0,0,0);
        root.isPickable = false;
        root.isVisible = false;

        ball.parent = root;
        //root.rotation = new Vector3(0, 270* Math.PI/180, 20 * Math.PI/180);
        root.position = new Vector3(0,2,.2);
        ball.physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.SphereImpostor, {mass: 1}, this.scene);


        ball.checkCollisions = true;

        ball.physicsImpostor.sleep();

        this.balls.push(ball);
        */


        /*ball.actionManager?.registerAction(
            new SetValueAction(
                {
                    trigger: ActionManager.OnIntersectionEnterTrigger,
                    parameter: othermesh
                },
                ball,
                function () {
                    console.log('hello');
                }
            )
            
        );*/


        //ball.physicsImpostor.applyImpulse(new Vector3(0,1,1), ball.getAbsolutePosition());


        var fairway = MeshBuilder.CreateGround("fairway", {width:20, height:50}, this.scene);
        fairway.position = new Vector3(0,0,5);
        //fairway.rotation = new Vector3(90*Math.PI/180, 0,0);
        fairway.isPickable = false;

        var grasstex = new Texture("assets/textures/grass.png", this.scene);
        var grassmat = new StandardMaterial("grassMaterial", this.scene);
        grassmat.diffuseTexture = grasstex;
        fairway.material = grassmat;

        fairway.physicsImpostor = new PhysicsImpostor(fairway, PhysicsImpostor.BoxImpostor, {mass:0 , restitution:.9}, this.scene);


        this.makeHole();
        this.xrCamera.position = new Vector3(0,1.5, -15);


        xrHelper.teleportation.addFloorMesh(fairway);


        this.scene.getPhysicsEngine()!.setTimeStep(1/100);

        
        
        
        this.scene.debugLayer.show(); 
    }

    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {


        this.processSteering(this.steeringBalls[0], this.steeringBalls[1]);

        if (this.count < 25){
            this.count++;
            //this.carts[0].physicsImpostor?.sleep();
        }
        if (this.count == 24 || this.carts[0].position.y > 5){
            //this.carts[0].physicsImpostor?.setLinearVelocity(new Vector3(0,0,0));
            //this.carts[0].physicsImpostor?.setAngularVelocity(new Vector3(0,0,0));

            this.carts[0].position.y = 1.5;


            //this.carts[0].position = new Vector3(0,0,5);
            //this.carts[0].rotation = new Vector3(0,0,0);
        }
        if(this.inDrive){
            this.xrCamera!.position = this.buttons[6].mesh!.absolutePosition.add(new Vector3(0,.5, 0));
        }
        if(this.inPass){
            this.xrCamera!.position = this.buttons[7].mesh!.absolutePosition.add(new Vector3(0,.5, 0));
        }
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

        // i guess that i have to do the collisions in update... i am sorry...

        //console.log('is this even working');
        var temp1 = 0;
        var temp2 = 0;
        for (var i = 0; i < this.clubs.length; i++){
            for (var j = 0; j < this.balls.length; j++){
                if(this.clubs[i].intersectsMesh(this.balls[j])){
                    this.clubToBall(i, j);
                }
            }
        }


        //this.balls[0]!.physicsImpostor!.applyImpulse(new Vector3(0,1,1), this.balls[0]);


    }

    // Process event handlers for controller input
    private makeHole()
    {
        var hole = MeshBuilder.CreateTorus("hole", {diameter:5, thickness:.2, tessellation:20}, this.scene);
        hole.position = new Vector3(0,0,-15);
    }

    private processControllerInput()
    {
        this.onRightTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
        this.onRightThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));
        //this.onRightSqueeze(this.rightController?.motionController?.getComponent("xr-standard-squeeze"));
        //this.onLeftSqueeze(this.leftController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onLeftTrigger(this.leftController?.motionController?.getComponent("xr-standard-trigger"));
    }

    private processSteering(anchor:Mesh, ball:Mesh)
    {   

        if(this.inDrive)
        {
            var difference = anchor.absolutePosition.subtract(ball.absolutePosition);
            console.log(difference.x, 'and ',difference.y)
            if(difference.x > .3)
            {   
                console.log('turning left');
                //this.carts[0].rotation.y -= .5 * Math.PI/180;
                var curX = this.xrCamera!.rotationQuaternion.toEulerAngles().x;
                var curY = this.xrCamera!.rotationQuaternion.toEulerAngles().y;
                var curZ = this.xrCamera!.rotationQuaternion.toEulerAngles().z;

                //curY -= .5*Math.PI/180;

                this.xrCamera!.rotationQuaternion = new Vector3(curX, curY, curZ).toQuaternion();
                this.xrCamera!.position = this.buttons[6].mesh!.absolutePosition.add(new Vector3(0,.5, 0));

            }
            if(difference.x < -.3)
            {
                console.log('turning left');

                //this.carts[0].rotation.y += .5 * Math.PI/180;
                var curX = this.xrCamera!.rotationQuaternion.toEulerAngles().x;
                var curY = this.xrCamera!.rotationQuaternion.toEulerAngles().y;
                var curZ = this.xrCamera!.rotationQuaternion.toEulerAngles().z;

                //curY += .5*Math.PI/180;

                this.xrCamera!.rotationQuaternion = new Vector3(curX, curY, curZ).toQuaternion();
                this.xrCamera!.position = this.buttons[6].mesh!.absolutePosition.add(new Vector3(0,.5, 0));

            }
            if(difference.y > .3)
            {
                console.log('forward ');

                //this.carts[0].position = this.carts[0].position.add(this.steeringBalls[2].position);
            }
            if(difference.y < -.3)
            {
                console.log('backward ');

                //this.carts[0].position = this.carts[0].position.subtract(this.steeringBalls[2].position);
            }
        }
    }

    private clubToBall(club: number, ball:number){
        var temp = club;
        var temp2 = ball;


        /*if(this.clubsimposters.includes(club)){
            for(var i = 0; i < this.clubsimposters.length; i++){
                if (this.clubsimposters[i] == club){
                    temp = i;
                }
            }
        }
        if(this.ballsImposters.includes(ball)){
            for(var i = 0; i < this.ballsImposters.length; i++){
                if (this.ballsImposters[i] == ball){
                    temp2 = i;
                }
            }
        }*/


        if(this.clubs[temp].name.includes("driv")){
            // do the medium height impulse
            this.balls[temp2].physicsImpostor!.applyImpulse( this.balls[temp2].absolutePosition.subtract(this.clubs[temp].absolutePosition.subtract(this.xrCamera!.position)).add(new Vector3(0,1,0)).scale(-1), this.balls[temp2].getAbsolutePosition());
            //this.balls[temp2].physicsImpostor!.applyImpulse( new Vector3(0,3,3), this.balls[temp2].getAbsolutePosition());

        }
        else if(this.clubs[temp].name.includes("iron")){
            // do the high height impulse
            this.balls[temp2].physicsImpostor!.applyImpulse( this.balls[temp2].absolutePosition.subtract(this.clubs[temp].absolutePosition.subtract(this.xrCamera!.position)).add(new Vector3(0,2,0)).scale(1), this.balls[temp2].getAbsolutePosition());
        }
        else {
            // do the low height impulse
            this.balls[temp2].physicsImpostor!.applyImpulse( this.balls[temp2].absolutePosition.subtract(this.clubs[temp].absolutePosition.subtract(this.xrCamera!.position)).add(new Vector3(0,.5,0)).scale(-1), this.balls[temp2].getAbsolutePosition()); 
        }
    }


    private onRightTrigger(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                

                if(this.inDrive)
                {
                    this.steeringBalls[1].parent = null;
                    //this.steeringBalls[1].position = this.rightController!.pointer.position;
                    this.steeringBalls[1].parent = this.rightController!.grip!;
                    this.steeringBalls[1].position = new Vector3(0,0,0);

                }
                else{
                    var pickInfo = this.pickInfo;
                    

                    

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
                        this.selectedRoot = <Mesh>pickInfo!.pickedMesh!.parent;
                        this.selectedObject!.enableEdgesRendering();
                        //this.selectedRoot!.position = this.rightController!.pointer!.position;
                        if (this.bags.includes(<Mesh>this.selectedObject!)){
                            this.buttons[0].mesh?.setEnabled(true);
                            this.buttons[1].mesh?.setEnabled(true);
                            this.buttons[2].mesh?.setEnabled(true);
                            this.buttons[3].mesh?.setEnabled(true);

                        }
                        // we gotta kill the objects overall physics so that we can move?
                        else
                        {
                            this.selectedObject!.physicsImpostor?.sleep();

                            this.selectedRoot!.position = new Vector3(0,0,0);

                            if(this.clubs.includes(<Mesh>this.selectedObject!)){
                                /*
                                this.selectedRoot!.rotate(new Vector3(1,0,0), -this.selectedRoot!.rotation.x + 183 *Math.PI/180, Space.LOCAL);
                                this.selectedRoot!.rotate(new Vector3(0,1,0), -this.selectedRoot!.rotation.y +91 *Math.PI/180, Space.LOCAL);
                                this.selectedRoot!.rotate(new Vector3(0,0,1), -this.selectedRoot!.rotation.z +217 *Math.PI/180, Space.LOCAL);
                                */
                                this.selectedRoot!.rotationQuaternion = new Vector3(183*Math.PI/180, 91* Math.PI/180, 217 * Math.PI/180).toQuaternion();
                            }
                            this.selectedRoot!.parent = this.rightController!.grip!;

                            // Parent the object to the transform on the laser pointer
                            //this.selectionTransform!.position = new Vector3(0, 0, pickInfo.distance);
                            //this.selectedRoot!.setParent(this.selectionTransform!);
                            }
                    }
                }
            }
            else
            {

                this.steeringBalls[1].parent = this.carts[0];
                this.steeringBalls[1].position = new Vector3(.455,.248,.491);
                // Reset the laser pointer color
                this.pickInfo = null;
                // Release the object from the laser pointer
                if(this.selectedObject)
                {
                    this.selectedRoot!.setParent(null);
                    this.selectedObject!.physicsImpostor?.wakeUp();
                }  
            }
        }
    }

    private onLeftTrigger(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
               var pickInfo = this.pickInfo;

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
                    this.selectedRoot = <Mesh>pickInfo!.pickedMesh!.parent;
                    this.selectedObject!.enableEdgesRendering();
                    //this.selectedRoot!.position = this.rightController!.pointer!.position;

                    if(this.bags.includes(<Mesh>this.selectedObject)){
                        this.buttons[0].mesh?.setEnabled(false);
                        this.buttons[1].mesh?.setEnabled(false);
                        this.buttons[2].mesh?.setEnabled(false);
                        this.buttons[3].mesh?.setEnabled(false);

                    }

                    // we gotta kill the objects overall physics so that we can move?
                    this.selectedObject!.physicsImpostor?.sleep();

                    this.selectedRoot!.position = new Vector3(0,0,0);

                    if(this.bags.includes(<Mesh>this.selectedObject!)){
                        this.selectedRoot!.rotationQuaternion = new Vector3(0, 0,0).toQuaternion();
                    }
                    this.selectedRoot!.parent = this.leftController!.grip!;

                    // Parent the object to the transform on the laser pointer
                    //this.selectionTransform!.position = new Vector3(0, 0, pickInfo.distance);
                    //this.selectedRoot!.setParent(this.selectionTransform!);
                }
            }
            else
            {
                // Reset the laser pointer color
                this.pickInfo = null;
                // Release the object from the laser pointer
                if(this.selectedObject)
                {
                    this.selectedRoot!.setParent(null);
                    this.selectedObject!.physicsImpostor?.wakeUp();
                }  
            }
        }
    }


    private onRightThumbstick(component?: WebXRControllerComponent)
    {
        if(this.inDrive)
        {
            if(component?.changes.axes)
            {
                
                // View-directed steering
                
                {
                    // Get the current camera direction
                    var directionVector = this.xrCamera!.getDirection(Axis.Z);

                    // Use delta time to calculate the move distance based on speed of 3 m/sec
                    var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

                    // Translate the camera forward
                    this.xrCamera!.position.addInPlace(new Vector3(directionVector.scale(moveDistance).x, 0, directionVector.scale(moveDistance).z));
                    this.carts[0].position.addInPlace(new Vector3(directionVector.scale(moveDistance).x, 0, directionVector.scale(moveDistance).z));

                    var curY = this.xrCamera!.rotationQuaternion.toEulerAngles().y;
                    this.carts[0].rotation.y = curY;
                    
                
                    
                }
            
            }
        }
    }


    


    private processPointer(pointerInfo: PointerInfo)
    {
        switch (pointerInfo.type) {
            case PointerEventTypes.POINTERDOWN:
                if (pointerInfo.pickInfo?.hit) {
                    //console.log(pointerInfo.pickInfo.pickedMesh?.name + " " + pointerInfo.pickInfo.pickedPoint);
                    this.pickInfo =  pointerInfo.pickInfo;
                }
                break;
        }
    }

}
/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();