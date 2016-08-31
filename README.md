sketchfab-scene-exporter
===================
The goal of this script is to allow you to export the models contained in a Sketchfab scene to a Blender-ready format without ever leaving the browser.  

Usage
---------------------
A download button will appear inside the scene viewer (as shown in the image below) when viewing a Sketchfab scene. The donwload action will download each mesh in the scene to a .OBJ and a .MTL file, in addition to downloading all the required textures. If your models are "flipped" after importing them into Blender, you should use the following settings during the import process:   
![requiredblenderimportobjsettings](https://cloud.githubusercontent.com/assets/3529573/3884105/ec8cdfe6-21a9-11e4-9a21-d6bad493daf1.png)
  
Installation
---------------------
If you have a userscript manager installed, loading https://github.com/IPv6/sketchfab-scene-exporter/raw/master/sketchfab-exporter-1.38.user.js should bring up a prompt to install the script. 

Compatibility
---------------------
Works ONLY on Firefox + Greasemonkey. Due use of XMLHttpRequests, script installed in DISABLED state (you have to enable it manually after installation)


