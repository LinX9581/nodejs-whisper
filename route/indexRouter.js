import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

let router = express.Router();

const allowedExtensions = [
    '.mp3', '.wav', '.m4a', // 音訊
    '.mp4', '.mov', '.avi', '.mkv' // 影片
];

// 簡單生成 SRT 格式（假設每行 5 秒）
function generateSRT(transcript) {
    const lines = transcript.split('\n');
    let srtContent = '';
    lines.forEach((line, index) => {
        if (line.trim()) {
            const startTime = new Date(index * 5000).toISOString().substr(11, 12).replace('.', ',');
            const endTime = new Date((index + 1) * 5000).toISOString().substr(11, 12).replace('.', ',');
            srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${line.trim()}\n\n`;
        }
    });
    return srtContent;
}

// 簡單生成 FCPXML 格式（僅示範，實際應用需更多細節）
function generateFCPXML(transcript) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
    <resources>
        <asset id="r1" name="transcribed_audio" />
    </resources>
    <library>
        <event name="Transcription">
            <project name="Transcript">
                <sequence>
                    <spine>
                        <title lane="0" offset="0s" duration="10s" format="r1">${transcript}</title>
                    </spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>`;
}

router.post('/upload', (req, res) => {
    if (!req.files || !req.files.video) {
        return res.status(400).send('No file uploaded.');
    }

    const video = req.files.video;
    const fileExt = path.extname(video.name).toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
        return res.status(400).send('Unsupported file format. Allowed formats: ' + allowedExtensions.join(', '));
    }

    const videoPath = path.join(__dirname, '../public/uploads', video.name);
    const baseName = path.parse(video.name).name;
    const txtFilePath = path.join(__dirname, '../public/downloads', `${baseName}_transcript.txt`);
    const srtFilePath = path.join(__dirname, '../public/downloads', `${baseName}_transcript.srt`);
    const fcpxmlFilePath = path.join(__dirname, '../public/downloads', `${baseName}_transcript.fcpxml`);

    video.mv(videoPath, async (err) => {
        if (err) return res.status(500).send('Failed to save file: ' + err.message);

        const formData = new FormData();
        formData.append('audio_file', fs.createReadStream(videoPath));

        try {
            const startTime = Date.now();
            const response = await axios.post('http://localhost:9000/asr?task=transcribe', formData, {
                headers: { ...formData.getHeaders() },
                responseType: 'text'
            });
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2); // 轉錄時間（秒）

            let transcript = typeof response.data === 'string' ? response.data : response.data.text;
            if (!transcript) throw new Error('No transcription text received');

            // 生成多格式檔案
            fs.writeFileSync(txtFilePath, transcript);
            fs.writeFileSync(srtFilePath, generateSRT(transcript));
            fs.writeFileSync(fcpxmlFilePath, generateFCPXML(transcript));

            // 檔案大小（MB）
            const fileSize = (video.size / (1024 * 1024)).toFixed(2);

            res.render('index', { 
                transcript,
                fileUrl: `/uploads/${video.name}`, // 播放路徑
                downloadLinks: {
                    txt: `/downloads/${baseName}_transcript.txt`,
                    srt: `/downloads/${baseName}_transcript.srt`,
                    fcpxml: `/downloads/${baseName}_transcript.fcpxml`
                },
                fileSize,
                duration
            });
        } catch (error) {
            console.error('Axios Error:', error.response ? error.response.data : error.message);
            const errorMessage = error.response 
                ? `Transcription failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`
                : `Transcription failed: ${error.message}`;
            res.status(500).send(errorMessage);
        }
    });
});

router.get('/', (req, res) => {
    res.render('index', {
        title: 'Nodejs-Template',
        transcript: null,
        fileUrl: null,
        downloadLinks: null,
        fileSize: null,
        duration: null
    });
});

export default router;