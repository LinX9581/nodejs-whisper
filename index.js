import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import 'dotenv/config';
import './global';
import './schedule/schedule';
import indexRouter from './route/indexRouter';
import fileUpload from 'express-fileupload';
import path from 'path';

const app = express();
const http = require('http').Server(app);

// 配置檔案上傳限制（50MB）
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    abortOnLimit: true,
    useTempFiles: true, // 使用臨時檔案避免內存溢出
    tempFileDir: '/tmp/' // 臨時檔案儲存路徑
}));

app.set("views", "views/");
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));

app.use('/', indexRouter);
console.log(process.env.status);

const host = '0.0.0.0';
const port = process.env.PORT || 3010;

http.listen(port, host, function() {
    console.log("Server started on " + port);
});