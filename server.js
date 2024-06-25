const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

app.use(bodyParser.json());

const GITHUB_TOKEN = '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';
const REPO_OWNER = 'fireboyfby';
const REPO_NAME = 'Commits';

app.post('/add-commit', async (req, res) => {
    const { commitMessage, changes } = req.body;

    try {
        const response = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        const shaLatestCommit = response.data.object.sha;

        const responseTree = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${shaLatestCommit}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        const baseTreeSha = responseTree.data.sha;

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

        const responseTreeNew = await axios.post(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, {
            base_tree: baseTreeSha,
            tree
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        const newTreeSha = responseTreeNew.data.sha;

        const responseCommit = await axios.post(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, {
            message: commitMessage,
            tree: newTreeSha,
            parents: [shaLatestCommit]
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        const newCommitSha = responseCommit.data.sha;

        await axios.patch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`, {
            sha: newCommitSha
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        res.status(200).send('Commit added successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to add commit');
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
