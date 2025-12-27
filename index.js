import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import './schedule/schedule.js';
import indexRouter from './route/indexRouter.js';
import fileUpload from 'express-fileupload';
import path from 'path';
import config from './config.js';

const app = express();
const host = '0.0.0.0';
const port = config.port;

// 配置檔案上傳限制（50MB）
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    abortOnLimit: true,
    useTempFiles: true, // 使用臨時檔案避免內存溢出
    tempFileDir: '/tmp/' // 臨時檔案儲存路徑
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set("views", "views/");
app.set("view engine", "ejs");
app.use(cors());
app.use(express.static('public'));
app.use('/', indexRouter);

app.listen(port, host, function() {
  console.log("Server started on port " + port);
});