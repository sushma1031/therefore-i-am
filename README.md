# Blog Website

A full-stack blog web application built using the following:

- Front-end: EJS with Bootstrap
- Back-end: Node.js with Express.js
- Cloud database: MongoDB Atlas
- Cloud image storage: Cloudinary
- Cloud host: Render

## Snapshots

![screenshot of the home page](assets/images/image.png)
![screenshot of the login page](assets/images/image2.png)
![screenshot of a blog post](assets/images/image3.png)

## Run Locally

1. Clone the repository and install dependencies: `npm install`
1. Create a `.env` file and populate it with the approriate values based on the example. 
1. MongoDB transactions require a replica set. If your local MongoDB is running as a standalone instance, configure it:
   - Add the following to your `mongod.conf`:
     ```yaml
     replication:
       replSetName: "rs0"
     ```
   - Restart MongoDB and initiate the replica set:
     ```bash
     <restart MongoDB, for eg: brew services restart mongodb-community>
     mongosh --eval "rs.initiate()"
     ```
1. Start the server: `npm run start`
1. Navigate to `localhost:3000` in your browser
