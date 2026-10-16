const fs = require('fs/promises')
const path = require('path').posix

// 支持命令行参数：node build.js fromBasePath=models toBasePath=indexes isCompress=false
const buildOptions = setBuildOptions({
  fromBasePath: 'models', // 模型文件夹，只读不写
  toBasePath: 'indexes', // 索引文件夹，每次 build 完全重建
  isCompress: false
})
const fromBasePath = buildOptions.fromBasePath
const toBasePath = buildOptions.toBasePath
const isCompress = buildOptions.isCompress

// Cubism 2 模型：目录内有 model.json，且 model 字段指向 .moc
const modelTemplateJsonFileName = 'model.json'
// Cubism 4 模型：目录内有 *.model3.json，且 FileReferences.Moc 指向 .moc3
const model3JsonSuffix = '.model3.json'
const modelTexturesFolderPath = 'textures'

const modelsIndexJsonFileName = 'models.json'
const textureDefaultJsonFileName = 'default.json'
const texturesIndexJsonFileName = 'textures.json'

const modelTypeCubism2 = 'cubism2'
const modelTypeCubism4 = 'cubism4'

const expressionSuffix = '.exp3.json'
const motionSuffix = '.motion3.json'

class Helper {
  static async ensureExistFolder(folderPath) {
    try {
      await fs.stat(folderPath)
    } catch (e) {
      await fs.mkdir(folderPath, { recursive: true })
      console.warn(`已新建 ${folderPath}`)
    }
  }

  static async deleteFolder(folderPath) {
    try {
      const stat = await fs.stat(folderPath)
      if (!stat.isDirectory()) {
        console.warn(`${folderPath} 不是文件夹`)
        return
      }
    } catch {
      return
    }

    await fs.rm(folderPath, { recursive: true, maxRetries: 5 })
    console.log(`已删除 ${folderPath}`)
  }

  static stringify(json) {
    return JSON.stringify(json, null, isCompress ? '' : '\t')
  }

  // 把「相对模型目录的路径」转成「相对索引目录的路径」，例如
  // models/星野/星野.moc3 -> ../../models/星野/星野.moc3
  static toRelativePath(fromModelPath, toModelPath, filePath) {
    return path.relative(toModelPath, path.normalize(`${fromModelPath}/${filePath}`))
  }

  static factorial(rest, result = [], detail = []) {
    if (rest.length === 0) {
      result.push(detail)
      return result
    }

    const current = rest[0]
    const newRest = rest.slice(1)

    current.forEach(currentSub => {
      Helper.factorial(newRest, result, [...detail, currentSub])
    })

    return result
  }
}

class Setting {
  static updateModel(fromModelPath, toModelPath, json) {
    if (json.model) {
      json.model = Helper.toRelativePath(fromModelPath, toModelPath, json.model)
    }
  }

  static updatePose(fromModelPath, toModelPath, json) {
    if (json.pose) {
      json.pose = Helper.toRelativePath(fromModelPath, toModelPath, json.pose)
    }
  }

  static updatePhysics(fromModelPath, toModelPath, json) {
    if (json.physics) {
      json.physics = Helper.toRelativePath(fromModelPath, toModelPath, json.physics)
    }
  }

  static updateExpressions(fromModelPath, toModelPath, json) {
    if (json.expressions) {
      json.expressions.forEach(({ file }, index, array) => {
        array[index].file = Helper.toRelativePath(fromModelPath, toModelPath, file)
      })
    }
  }

  static updateMotions(fromModelPath, toModelPath, json) {
    if (json.motions) {
      Object.values(json.motions).forEach(groups => {
        groups.forEach((motion, index, array) => {
          if (motion.file) {
            array[index].file = Helper.toRelativePath(fromModelPath, toModelPath, motion.file)
          }
          if (motion.sound) {
            array[index].sound = Helper.toRelativePath(fromModelPath, toModelPath, motion.sound)
          }
        })
      })
    }
  }

  static updateTextures(fromModelPath, toModelPath, json, textures = []) {
    json.textures = textures.map(texture => {
      return Helper.toRelativePath(fromModelPath, toModelPath, texture)
    })
  }

  // Cubism 4：FileReferences 下的字符串（含数组、嵌套对象里的）基本都是相对模型目录的文件路径，
  // 但 Expressions[].Name 是表情显示名，必须原样保留
  static updateFileReferences(fromModelPath, toModelPath, node, skipKeys = ['Name']) {
    if (typeof node === 'string') {
      return Helper.toRelativePath(fromModelPath, toModelPath, node)
    }

    if (Array.isArray(node)) {
      return node.map(item => Setting.updateFileReferences(fromModelPath, toModelPath, item, skipKeys))
    }

    if (node && typeof node === 'object') {
      const result = {}
      Object.keys(node).forEach(key => {
        if (skipKeys.includes(key)) {
          result[key] = node[key]
          return
        }
        result[key] = Setting.updateFileReferences(fromModelPath, toModelPath, node[key], skipKeys)
      })
      return result
    }

    return node
  }
}

init()

async function init() {
  await Helper.deleteFolder(toBasePath)
  await Helper.ensureExistFolder(toBasePath)

  const models = await createModelsIndexJsonFile()

  await Promise.all(models.map(async model => {
    console.log(`开始转换：${model.modelPath}`)

    if (model.type === modelTypeCubism4) {
      await createCubism4IndexJsonFiles(model)
    } else {
      await createCubism2IndexJsonFiles(model)
    }

    console.log(`转换完成：${model.modelPath}`)
  }))
}

async function createModelsIndexJsonFile() {
  const models = await getAllModelPaths()

  const modelsIndex = models.map(({ modelIntroduce, modelPath, type }) => ({
    modelIntroduce,
    modelPath,
    type
  }))

  await fs.writeFile(`${toBasePath}/${modelsIndexJsonFileName}`, Helper.stringify(modelsIndex))
  return models
}

// ---------- Cubism 2 ----------

async function createCubism2IndexJsonFiles({ modelPath }) {
  const fromModelPath = `${fromBasePath}/${modelPath}`
  const toModelPath = `${toBasePath}/${modelPath}`

  await Helper.ensureExistFolder(toModelPath)

  await createTextureJsonFiles(fromModelPath, toModelPath)
  await createTexturesIndexJsonFile(toModelPath)
}

async function createTexturesIndexJsonFile(toModelPath) {
  const dirents = await fs.readdir(toModelPath, { withFileTypes: true })
  const textureNames = dirents.map(dirent => path.parse(dirent.name).name)
  await fs.writeFile(`${toModelPath}/${texturesIndexJsonFileName}`, Helper.stringify(textureNames))
  return textureNames
}

async function createTextureJsonFiles(fromModelPath, toModelPath) {
  const textureDefaultJsonStr = await getTextureDefaultJsonStr(fromModelPath, toModelPath)

  await fs.writeFile(`${toModelPath}/${textureDefaultJsonFileName}`, textureDefaultJsonStr)

  const textureGroups = await getTextureGroups(fromModelPath, toModelPath)

  const allTextures = Helper.factorial(textureGroups.map(({ textures }) => textures))

  await Promise.all(allTextures.map(async textures => {
    const textureJson = JSON.parse(textureDefaultJsonStr)

    Setting.updateTextures(fromModelPath, toModelPath, textureJson, textures.map((texture, index) => {
      const { partName } = textureGroups[index]
      return `${modelTexturesFolderPath}/${partName}/${texture}`
    }))

    await fs.writeFile(`${toModelPath}/${textures.map(texture => path.parse(texture).name).join('&')}.json`, Helper.stringify(textureJson))
  }))
}

async function getTextureDefaultJsonStr(fromModelPath, toModelPath) {
  const modelTemplateJsonFile = await fs.readFile(`${fromModelPath}/${modelTemplateJsonFileName}`, 'utf-8')

  const defaultTextureJson = JSON.parse(modelTemplateJsonFile)

  Setting.updateModel(fromModelPath, toModelPath, defaultTextureJson)
  Setting.updatePose(fromModelPath, toModelPath, defaultTextureJson)
  Setting.updatePhysics(fromModelPath, toModelPath, defaultTextureJson)
  Setting.updateExpressions(fromModelPath, toModelPath, defaultTextureJson)
  Setting.updateMotions(fromModelPath, toModelPath, defaultTextureJson)
  Setting.updateTextures(fromModelPath, toModelPath, defaultTextureJson, defaultTextureJson.textures)

  return Helper.stringify(defaultTextureJson)
}

async function getTextureGroups(fromModelPath) {
  // texture 是分部分的，几个文件夹就几部分，也就是数组的长度，从模板文件获取顺序
  const modelTemplateJsonFile = await fs.readFile(`${fromModelPath}/${modelTemplateJsonFileName}`, 'utf-8')

  const defaultPartNames = JSON.parse(modelTemplateJsonFile).textures.map(texture => path.parse(texture).dir.split('/').pop())

  const textureGroups = Array(defaultPartNames.length).fill(null)

  await Promise.all(defaultPartNames.map(async (partName, index) => {
    textureGroups[index] = {
      partName,
      textures: await fs.readdir(`${fromModelPath}/${modelTexturesFolderPath}/${partName}`)
    }
  }))

  return textureGroups
}

// ---------- Cubism 4 ----------

async function createCubism4IndexJsonFiles({ modelPath, model3JsonFileName, fileNames }) {
  const fromModelPath = `${fromBasePath}/${modelPath}`
  const toModelPath = `${toBasePath}/${modelPath}`

  await Helper.ensureExistFolder(toModelPath)

  const model3Json = JSON.parse(await fs.readFile(`${fromModelPath}/${model3JsonFileName}`, 'utf-8'))

  const defaultTextureJson = createCubism4DefaultTextureJson(model3Json, fromModelPath, toModelPath, fileNames)

  await fs.writeFile(`${toModelPath}/${textureDefaultJsonFileName}`, Helper.stringify(defaultTextureJson))

  // Cubism 4 的贴图在 model3.json 中一次性声明，不按部件派生多套皮肤，因此只有 default 一种
  await fs.writeFile(`${toModelPath}/${texturesIndexJsonFileName}`, Helper.stringify([path.parse(textureDefaultJsonFileName).name]))
}

function createCubism4DefaultTextureJson(model3Json, fromModelPath, toModelPath, fileNames = []) {
  const json = JSON.parse(JSON.stringify(model3Json))

  const fileReferences = json.FileReferences || (json.FileReferences = {})

  // 源模型未声明表情时，按目录里的 *.exp3.json 自动补全
  if (!fileReferences.Expressions) {
    const expressions = fileNames.filter(name => name.endsWith(expressionSuffix))
    if (expressions.length) {
      fileReferences.Expressions = expressions.map(name => ({
        Name: name.slice(0, -expressionSuffix.length),
        File: name
      }))
    }
  }

  // 源模型未声明动作时，按目录里的 *.motion3.json 自动归入 Idle 分组
  if (!fileReferences.Motions) {
    const motions = fileNames.filter(name => name.endsWith(motionSuffix))
    if (motions.length) {
      fileReferences.Motions = {
        Idle: motions.map(name => ({ File: name }))
      }
    }
  }

  json.FileReferences = Setting.updateFileReferences(fromModelPath, toModelPath, fileReferences)

  return json
}

// ---------- 模型扫描 ----------

async function getAllModelPaths() {
  const models = []
  await fillModelPath(fromBasePath)
  return models

  async function fillModelPath(dirPath) {
    let dirents
    try {
      dirents = await fs.readdir(dirPath, { withFileTypes: true })
    } catch (e) {
      return
    }

    // 固定顺序，保证 models.json 稳定可复现
    dirents.sort((a, b) => a.name.localeCompare(b.name))

    const fileNames = dirents.filter(dirent => dirent.isFile()).map(dirent => dirent.name)

    // Cubism 2
    if (fileNames.includes(modelTemplateJsonFileName)) {
      const json = JSON.parse(await fs.readFile(`${dirPath}/${modelTemplateJsonFileName}`, 'utf-8'))
      models.push({
        type: modelTypeCubism2,
        modelIntroduce: json.modelIntroduce,
        modelPath: dirPath.slice(fromBasePath.length + 1)
      })
      return
    }

    // Cubism 4
    const model3JsonFileName = fileNames.find(name => name.endsWith(model3JsonSuffix))
    if (model3JsonFileName) {
      const json = JSON.parse(await fs.readFile(`${dirPath}/${model3JsonFileName}`, 'utf-8'))
      models.push({
        type: modelTypeCubism4,
        modelIntroduce: json.modelIntroduce || dirPath.slice(dirPath.lastIndexOf('/') + 1),
        modelPath: dirPath.slice(fromBasePath.length + 1),
        model3JsonFileName,
        fileNames
      })
      return
    }

    for (const dirent of dirents) {
      if (dirent.isDirectory()) {
        await fillModelPath(`${dirPath}/${dirent.name}`)
      }
    }
  }
}

function setBuildOptions(buildOptions) {
  process.argv.slice(2).forEach(arg => {
    const [key, val] = arg.split('=')
    switch (key) {
      case 'isCompress':
        Object.assign(buildOptions, {
          [key]: val === 'true'
        })
        break
      case 'fromBasePath':
      case 'indexes':
        Object.assign(buildOptions, {
          [key]: val
        })
    }
  })
  return buildOptions
}
