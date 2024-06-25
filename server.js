const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

app.use(bodyParser.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Use the environment variable
const REPO_OWNER = 'fireboyfby';
const REPO_NAME = 'Commits';

app.post('/add-commit', async (req, res) => {
    const { commitMessage, changes } = req.body;

    try {
        console.log('Fetching latest commit SHA...');
        const response = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        const shaLatestCommit = response.data.object.sha;
        console.log(`Latest commit SHA: ${shaLatestCommit}`);

        console.log('Fetching base tree SHA...');
        const responseTree = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${shaLatestCommit}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        const baseTreeSha = responseTree.data.sha;
        console.log(`Base tree SHA: ${baseTreeSha}`);

        console.log('Creating blobs for changes...');
        const changesObj = JSON.parse(changes);
        const blobPromises = Object.keys(changesObj).map(filePath =>
            axios.post(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
                content: changesObj[filePath],
                encoding: 'utf-8'
            }, {
                headers: { Authorization: `token ${GITHUB_TOKEN}` }
            })
        );

        const blobs = await Promise.all(blobPromises);
        const tree = blobs.map((blob, index) => ({
            path: Object.keys(changesObj)[index],
            mode: '100644',
            type: 'blob',
            sha: blob.data.sha
        }));
        console.log('Blobs created.');

        console.log('Creating new tree...');
        const responseTreeNew = await axios.post(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, {
            base_tree: baseTreeSha,
            tree
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        const newTreeSha = responseTreeNew.data.sha;
        console.log(`New tree SHA: ${newTreeSha}`);

        console.log('Creating new commit...');
        const responseCommit = await axios.post(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, {
            message: commitMessage,
            tree: newTreeSha,
            parents: [shaLatestCommit]
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        const newCommitSha = responseCommit.data.sha;
        console.log(`New commit SHA: ${newCommitSha}`);

        console.log('Updating reference to point to new commit...');
        await axios.patch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`, {
            sha: newCommitSha
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        res.status(200).send('Commit added successfully');
    } catch (error) {
        console.error('Error adding commit:', error);
        res.status(500).send('Failed to add commit');
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
