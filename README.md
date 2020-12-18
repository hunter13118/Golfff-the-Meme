# Assignment 4: Making Beat Saber in Babylon

**Due: Monday, October 19, 10:00pm CDT**

[Beat Saber](https://beatsaber.com/) is widely considered to be one of the best and most successful virtual reality games.  There is a free demo available for the Oculus Quest, which you can find in the official store app.  Before beginning this assignment, I suggest that you download this demo to familiarize yourself with the gameplay. 

In this assignment, you will be implementing Beat Saber's core mechanics.  The template code includes a very simple scene with an example music track and a single cube that flies towards the user.  You can use `MeshBuilder` for this assignment, and you do not need to import custom meshes.  If you want to make your game more interesting, you are also free to import additional assets, such as models, textures, or music. You can also modify any of the colors, textures, or lighting in the example scene. Creativity is encouraged!  However, note that your grade will be based on the interaction functionality, not the artistic quality of the scene.  

## Submission Information

You should fill out this information before submitting your assignment.  Make sure to document the name and source of any third party assets such as 3D models, textures, or any other content used that was not solely written by you.  Include sufficient detail for the instructor or TA to easily find them, such as asset store or download links.

Name: Hunter Uhr

UMN Email: uhrxx009@umn.edu

Build URL:http://www-users.cselabs.umn.edu/~uhrxx009/vr-hw4/

Third Party Assets:

ALL TEXTURES WERE MADE BY ME

gun shooting sfx ->	http://soundbible.com/1405-Dry-Fire-Gun.html
sword noise sfx -> http://soundbible.com/706-Swoosh-3.html
collision sfx -> http://soundbible.com/1343-Jump.html

## Rubric

Graded out of 20 points.  

1. Add a "saber" that is attached to the top of each controller.  It should be pointing directly straight up when you hold the controller upright, similar holding a sword.  You can use a box for the geometry, but it should have an interesting color or texture.  You do not need to make the controller model invisible, although you can replace it entirely if you want.  (2)  

2. The user should be able to toggle a saber on or off whenever they press the grip (squeeze) button on the corresponding controller. Both sabers should be turned off initially.  (2)

3. The cube should be destroyed upon contact with a saber.  Hint: you can use the `.dispose()` method to delete an object from the scene. (2)

4. Spawn new cubes at regular time intervals.  The cubes should be initially placed 10 meters away and fly towards the user at the same speed as the example cube.  They should be placed at random XY positions so that they are reachable with the saber without requiring the user to walk around.  (2)

   *Optionally, you can try to time the cube spawning to the beat of the music!  This is just for fun, though, and is not part of the grade.*

5. The sabers should be able to destroy any cube that they hit.  (2)

6. Whenever a new cube is spawned and there are already 10 cubes present in the scene, destroy the oldest one. We don't want to create infinite cubes that will slow down the Oculus Quest! (2)

7. Now, we are going to add some custom gameplay that is not in the original Beat Saber.  When the saber is toggled off, the user should be able to shoot a small sphere in the controller's forward direction by pressing the trigger button.  The trigger button should not do anything when the saber is toggled on. The spheres should have an interesting color or texture that is different from the cubes. (2)

8. When a sphere collides with a cube, the sphere should be destroyed, and the cube should bounce off using physics. You can adjust the mass of the sphere to influence the force that gets applied during the collision. (2)

9. Make sure that when the user enters and exits immersive mode, all the physics objects pause and resume properly. (2)

10. Add sound effects for the toggling the saber on and off, shooting a sphere, and destroying a cube.  You do not need to add a sound effect when cubes are destroyed in the background in step 6. (1)

11. Add a particle effect whenever a cube is destroyed. (1)

**Bonus Challenge:** In the original game, cubes are only destroyed when the user swings a saber in a specific direction (up, down, left, or right). Implement this functionality in your game. Note that you will need to add a visual indicator to the cube that specifies the direction to hit. The direction should be randomly chosen when each cube spawns. (2)

Make sure to document all third party assets. ***Be aware that points will be deducted for using third party assets that are not properly documented.***

## Submission

You will need to check out and submit the project through GitHub classroom.  The project folder should contain just the additions to the sample project that are needed to implement the project.  Do not add extra files, and do not remove the `.gitignore` file (we do not want the "node_modules" directory in your repository.)

**Do not change the names** of the existing files.  The TA needs to be able to test your program as follows:

1. cd into the directory and run ```npm install```
2. start a local web server and compile by running ```npm run start``` and pointing the browser at your ```index.html```

Please test that your submission meets these requirements.  For example, after you check in your final version of the assignment to GitHub, check it out again to a new directory and make sure everything builds and runs correctly.

## Local Development 

After checking out the project, you need to initialize by pulling the dependencies with:

```
npm install
```

After that, you can compile and run a server with:

```
npm run start
```

Under the hood, we are using the `npx` command to both build the project (with webpack) and run a local http webserver on your machine.  The included ```package.json``` file is set up to do this automatically.  You do not have to run ```tsc``` to compile the .js files from the .ts files;  ```npx``` builds them on the fly as part of running webpack.

You can run the program by pointing your web browser at ```https://your-local-ip-address:8080```.  

## Build and Deployment

After you have finished the assignment, you can build a distribution version of your program with:

```
npm run build
```

Make sure to include your assets in the `dist` directory.  The debug layer should be disabled in your final build.  Upload it to your public `.www` directory, and make sure to set the permissions so that it loads correctly in a web browser.  You should include this URL in submission information section of your `README.md` file. 

This project also includes a `deploy.sh` script that can automate the process of copying your assets to the `dist` directory, deploying your build to the web server, and setting public permissions.  To use the script, you will need to use a Unix shell and have`rsync` installed.  If you are running Windows 10, then you can use the [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10).  Note that you will need to fill in the missing values in the script before it will work.

## License

Material for [CSCI 5619 Fall 2020](https://canvas.umn.edu/courses/194179) by [Evan Suma Rosenberg](https://illusioneering.umn.edu/) is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

The intent of choosing CC BY-NC-SA 4.0 is to allow individuals and instructors at non-profit entities to use this content.  This includes not-for-profit schools (K-12 and post-secondary). For-profit entities (or people creating courses for those sites) may not use this content without permission (this includes, but is not limited to, for-profit schools and universities and commercial education sites such as Coursera, Udacity, LinkedIn Learning, and other similar sites).   

## Acknowledgments

This assignment was partially based upon content from the [3D User Interfaces Fall 2020](https://github.blairmacintyre.me/3dui-class-f20) course by Blair MacIntyre and was inspired by the [Making Beat Saber in 10 Minutes](https://www.youtube.com/watch?v=gh4k0Q1Pl7E) video on YouTube.

The included example music is "Hyperspace - Lightyears Away" from the [Star Control 2 Music Remix Project](http://www.medievalfuture.com/precursors/music.php).

