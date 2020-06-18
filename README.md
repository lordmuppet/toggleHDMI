# toggleHDMI
Turn off and on HDMI on Raspberry PI via REST API

`node index.js` to start the server

To debug:
Launch the `Launch Program` file in VS Code

```
        {
            "name": "Launch Program",
            "program": "${workspaceFolder}/index.js",
            "request": "launch",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "type": "pwa-node"
        }

```