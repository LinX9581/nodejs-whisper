import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import ytdl from '@distube/ytdl-core';
import query from '../mysql-connect';
import 'dotenv/config';

const router = express.Router();
const allowedExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.mov', '.avi', '.mkv'];
const YOUTUBE_COOKIES = process.env.YOUTUBE_COOKIES || '';

// 生成檔案名稱
const generateFileName = (base, ext = '') => `nn_${base}_${Math.floor(Math.random() * 1000000)}${ext}`;

// 生成 SRT
const generateSRT = (transcript) => {
    return transcript.split('\n').map((line, i) => {
        if (!line.trim()) return '';
        const start = new Date(i * 5000).toISOString().substr(11, 12).replace('.', ',');
        const end = new Date((i + 1) * 5000).toISOString().substr(11, 12).replace('.', ',');
        return `${i + 1}\n${start} --> ${end}\n${line.trim()}\n`;
    }).join('\n');
};

// 生成 FCPXML
const generateFCPXML = (transcript) => `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
    <resources><asset id="r1" name="transcribed_audio" /></resources>
    <library><event name="Transcription"><project name="Transcript">
        <sequence><spine><title lane="0" offset="0s" duration="10s" format="r1">${transcript}</title></spine></sequence>
    </project></event></library>
</fcpxml>`;

// 儲存歷史紀錄到資料庫
const saveHistory = async (type, name, links) => {
    await query(
        'INSERT INTO whisper_nodejs.upload_history (type, name, txt_link, srt_link, fcpxml_link) VALUES (?, ?, ?, ?, ?)',
        [type, name, links.txt, links.srt, links.fcpxml]
    );
};

// 檔案上傳
router.post('/upload', async (req, res) => {
    if (!req.files?.video) return res.status(400).send('No file uploaded.');

    const video = req.files.video;
    const fileExt = path.extname(video.name).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
        return res.status(400).send(`Unsupported file format. Allowed: ${allowedExtensions.join(', ')}`);
    }

    const baseName = generateFileName(path.parse(video.name).name);
    const videoPath = path.join(__dirname, '../public/uploads', `${baseName}${fileExt}`);
    const links = {
        txt: `/downloads/${baseName}_transcript.txt`,
        srt: `/downloads/${baseName}_transcript.srt`,
        fcpxml: `/downloads/${baseName}_transcript.fcpxml`
    };

    try {
        await video.mv(videoPath);
        const transcript = await transcribe(videoPath);
        const fileSize = (video.size / (1024 * 1024)).toFixed(2);
        const duration = await writeFiles(videoPath, baseName, transcript);

        await saveHistory('file', video.name, links);

        res.render('index', {
            tab: 'file',
            transcript,
            fileUrl: `/uploads/${baseName}${fileExt}`,
            downloadLinks: links,
            fileSize,
            duration,
            history: await query('SELECT * FROM whisper_nodejs.upload_history ORDER BY created_at DESC')
        });
    } catch (error) {
        console.error('Upload Error:', error.message);
        res.status(500).send(`Transcription failed: ${error.message}`);
    }
});

// YouTube 連結
router.post('/youtube', async (req, res) => {
    const { youtubeUrl } = req.body;
    if (!youtubeUrl || !ytdl.validateURL(youtubeUrl)) {
        return res.status(400).send('Invalid YouTube URL.');
    }

    const videoId = ytdl.getURLVideoID(youtubeUrl);
    const baseName = generateFileName(videoId);
    const videoPath = path.join(__dirname, '../public/uploads', `${baseName}.mp3`);
    const links = {
        txt: `/downloads/${baseName}_transcript.txt`,
        srt: `/downloads/${baseName}_transcript.srt`,
        fcpxml: `/downloads/${baseName}_transcript.fcpxml`
    };

    try {
        await downloadYouTube(youtubeUrl, videoPath);
        const transcript = await transcribe(videoPath);
        const fileSize = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);
        const duration = await writeFiles(videoPath, baseName, transcript);

        await saveHistory('youtube', youtubeUrl, links);

        res.render('index', {
            tab: 'youtube',
            transcript,
            fileUrl: `/uploads/${baseName}.mp3`,
            downloadLinks: links,
            fileSize,
            duration,
            history: await query('SELECT * FROM whisper_nodejs.upload_history ORDER BY created_at DESC')
        });
    } catch (error) {
        console.error('YouTube Error:', error.message);
        res.status(500).send(`YouTube processing failed: ${error.message}`);
    }
});

// 首頁
router.get('/', async (req, res) => {
    res.render('index', {
        title: 'Nodejs-Template',
        tab: 'file',
        transcript: null,
        fileUrl: null,
        downloadLinks: null,
        fileSize: null,
        duration: null,
        history: await query('SELECT * FROM whisper_nodejs.upload_history ORDER BY created_at DESC')
    });
});

// 輔助函數：轉錄
async function transcribe(filePath) {
    const formData = new FormData();
    formData.append('audio_file', fs.createReadStream(filePath));
    const response = await axios.post('http://localhost:9000/asr?task=transcribe', formData, {
        headers: formData.getHeaders(),
        responseType: 'text'
    });
    const transcript = typeof response.data === 'string' ? response.data : response.data.text;
    if (!transcript) throw new Error('No transcription text received');
    return transcript;
}

// 輔助函數：寫入檔案並計算時間
async function writeFiles(filePath, baseName, transcript) {
    const startTime = Date.now();
    const txtPath = path.join(__dirname, '../public/downloads', `${baseName}_transcript.txt`);
    const srtPath = path.join(__dirname, '../public/downloads', `${baseName}_transcript.srt`);
    const fcpxmlPath = path.join(__dirname, '../public/downloads', `${baseName}_transcript.fcpxml`);

    await Promise.all([
        fs.promises.writeFile(txtPath, transcript),
        fs.promises.writeFile(srtPath, generateSRT(transcript)),
        fs.promises.writeFile(fcpxmlPath, generateFCPXML(transcript))
    ]);

    return ((Date.now() - startTime) / 1000).toFixed(2);
}

// 輔助函數：下載 YouTube
async function downloadYouTube(url, outputPath) {
    // 從環境變數載入 cookies，預設為空陣列
    // const cookies = process.env.YOUTUBE_COOKIES ? JSON.parse(process.env.YOUTUBE_COOKIES) : [];
    // if (cookies.length === 0) {
    //     console.warn('No cookies provided, YouTube download may fail.');
    // }

    // 創建帶有 cookies 的 agent
    // const agent = ytdl.createAgent(cookies);

    // 使用 agent 下載 YouTube 影片
    const stream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
        // agent,
      });

    const fileStream = fs.createWriteStream(outputPath);
    stream.pipe(fileStream);

    return new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', (err) => reject(new Error(`File stream error: ${err.message}`)));
        stream.on('error', (err) => reject(new Error(`YouTube download error: ${err.message}`)));
    });
}
export default router;