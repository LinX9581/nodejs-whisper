import schedule from "node-schedule";
import { exec } from "child_process";
import { promisify } from "util";
import query from "../mysql-connect.js";
import moment from "moment";

const execProm = promisify(exec);

// test();
async function test() {
  let cmd_res = await execProm(`ls -l`);
  console.log(cmd_res);
  let query_res = await query("show databases;", "", "schedule.js test");
  console.log(query_res);
}

schedule.scheduleJob("0 1 0 * * *", async function () {
  try {
    let yesterday = moment(new Date()).format("YYYY-MM-DD");
    console.log(yesterday);
    // await execProm(`mysqldump -h ${process.env.db_host} -u ${process.env.db_user} -p${process.env.db_password} www > /db/www.sql`)
    // await execProm(`gsutil cp -r /db/www.sql gs://db-backup/www-${yesterday}.sql`);
  } catch (error) {
    console.log(error);
  }
});
