# grunt-deploment-script
A script that helps deploy applications to multiple environments using rsync.

## Installing:
Copy the `Gruntfile.js` and `Package.json` to your project and npm install
```bash
npm install
```

## Adding environments
In the package.json add your server cred there in the follow snippet.

```javascript
"servers": {
        "prod": {
          "ip": "Production_Ip_Goes_Here",
          "user": "Production_User_Goes_Here",
          "dest": "Destination_On_Server_To_Sync_To_Goes_Here",
          "replace-configs": {
            "src": [],
            "actions": []
          }
        },
        "stage": {
          "ip": "Staging_Ip_Goes_Here",
          "user": "Staging_User_Goes_Here",
          "dest": "Destination_On_Server_To_Sync_To_Goes_Here",
          "replace-configs": {
            "src": [],
            "actions": []
          }
        }
        ```
