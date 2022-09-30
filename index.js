var levelup = require('levelup')
var leveldown = require('leveldown')
const fs = require('fs')
const http = require('http')
const Guid = require('guid');
const path = require("path");


async function getDownloadHistory(guid) {
  const toPath = `./copyFiles/${guid}`
  let db = undefined;
  try {
    const copyPath = "C:/Users/毛致武/AppData/Local/Google/Chrome/User Data/Default/Local Extension Settings/cblpjenafgeohmnjknfhpdbdljfkndig"

    fs.mkdirSync(toPath)
    copyDir(copyPath, path.resolve(__dirname, toPath), 'LOCK');

    db = levelup(leveldown(toPath))

    return await db.get('twMediaDownloader-date-range-info')
      .then((res) => {
        let text = res.toString().replaceAll('\\', '')
        text = text.substr(1, text.length)
        text = text.substr(0, text.length - 1)

        fs.writeFile('./log/twMediaDownloader-date-range-info.json', text, (err) => {
          console.log(err);
        })

        const user = JSON.parse(text).user

        deleteFiles(db, toPath);

        const result = [];
        Object.keys(user).forEach((key) => {
          result.push({
            user: key,
            min_datetime: user[key].min_datetime,
            max_datetime: user[key].max_datetime,
            download_datetime: user[key].download_datetime
          })
        })

        return result.sort((a, b) => {
          return a.creatTime > b.creatTime ? 1 : -1;
        })
      })
  }
  catch (err) {
    console.log(err);
    deleteFiles(db, toPath);
    return []
  }
}

function copyDir(srcDir, desDir, ignore) {
  fs.readdir(srcDir, { withFileTypes: true }, (err, files) => {
    for (const file of files) {

      if (file.name.endsWith(ignore)) {
        continue;
      }

      //判断是否为文件夹
      if (file.isDirectory()) {
        const dirS = path.resolve(srcDir, file.name);
        const dirD = path.resolve(desDir, file.name);
        //判断是否存在dirD文件夹
        if (!fs.existsSync(dirD)) {
          fs.mkdir(dirD, (err) => {
            if (err) console.log(err);
          });
        }
        copyDir(dirS, dirD);
      } else {
        const srcFile = path.resolve(srcDir, file.name);
        const desFile = path.resolve(desDir, file.name);
        fs.copyFileSync(srcFile, desFile);
        // console.log(file.name + ' 拷贝成功');
      }
    }
  })
}


const start = () => {
  const guid = Guid.create().value
  let index = 0;
  var server = http.createServer()

  server.listen(5005, function () {
    console.log('服务器启动成功了，可以通过 http://127.0.0.1:5005/ 来进行访问')
  })

  server.on('request', async function (request, response) {
    console.log('已经响应了', index++);

    const guid = Guid.create().value
    let res = {}
    switch (request.url) {
      case "/":
        res = await getDownloadHistory(guid)
        break
    }

    response.write(JSON.stringify(res))
    response.end()
  })
}

function deleteFiles(db, filePath) {
  if (!db) {
    return
  }
  db.close(() => {
    try {
      var files = fs.readdirSync(filePath)
      files.forEach((item) => {
        fs.unlinkSync(path.resolve(filePath, item))
      })
      fs.rmdirSync(filePath)
    }
    catch (err) {
      console.log(err);
      return err
    }
  })
}

start();