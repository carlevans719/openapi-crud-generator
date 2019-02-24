#!/usr/bin/env node

const inquirer = require('inquirer')
const inflect = require('inflection')
const path = require('path')
const fs = require('fs')
const buildTemplate = require('./buildTemplate')

async function ask (question) {
  const { answer } = await inquirer.prompt([{
    type: 'confirm',
    name: 'answer',
    message: question
  }])

  return answer
}

async function getBasicInfo () {
  return inquirer.prompt([{
    type: 'input',
    name: 'pathName',
    message: 'How is the resource represented in the path? E.g. "users", "user-hobbies" or "users/avatars"',
    validate: userInput => userInput.match(/[A-Z]/) ? 'Path names should not contain any upper-case characters' : true
  }, {
    type: 'input',
    name: 'modelName',
    message: 'What is the name of the resource\'s entity? E.g. "User", "UserHobby" or "UserAvatar"',
    validate: userInput => userInput.match(/^[A-Z]/) ? true : 'Entity should start with an upper-case character',
    default: answers => answers.pathName
      .replace(/-/g, '_') // dashes to underscores so inflect.classify works
      .split('/') // split on "/" in case of nested resource
      .map(inflect.classify) // classify each path part (convert to singular and sentence case)
      .join('')
  }, {
    type: 'input',
    name: 'modelNamePlural',
    message: 'What is the plural name of the resource\'s entity? E.g. "Users", "UserHobbies" or "UserAvatars"',
    validate: userInput => userInput.match(/^[A-Z]/) ? true : 'Entity should start with an upper-case character',
    default: answers => inflect.pluralize(answers.modelName)
  }, {
    type: 'input',
    name: 'modelNameDash',
    message: 'What is the name of the model for use in event names? E.g. "user", "user-hobby" or "user-avatar"',
    validate: userInput => userInput.match(/[A-Z]/) ? 'Model event name should not contain any upper-case characters' : true,
    default: answers => inflect.dasherize(answers.pathName
      .replace(/-/g, '_') // dashes to underscore so inflect.singularize works
      .split('/') // split on "/" in case of nested resource
      .map(part => inflect.singularize(part)) // singularize each path part
      .join('_'))
  }])
}

async function getModelData () {
  const props = []

  if (await ask('Would you like to add properties to the model?')) {
    do {
      props.push(await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: 'What is the name of the property?'
      }, {
        type: 'input',
        name: 'type',
        message: 'What is the type of the property?'
      }, {
        type: 'confirm',
        name: 'required',
        message: 'Is this property mandatory?'
      }, {
        type: 'confirm',
        name: 'creatable',
        default: true,
        message: 'Can clients provide this value when creating this entity?'
      }, {
        type: 'confirm',
        name: 'updatable',
        default: true,
        message: 'Can clients update this value?'
      }]))
    } while (await ask('Would you like to add another property?'))
  }

  return props
}

async function getOutPath () {
  const { outPath } = await inquirer.prompt([{
    type: 'input',
    name: 'outPath',
    message: 'Where do you want the schema to be written?',
    default: path.join(process.cwd(), 'out.json')
  }])

  return outPath
}

async function writeOutput (outPath, template) {
  try {
    fs.writeFileSync(outPath, JSON.stringify(template, null, 2))
  } catch (ex) {
    console.error(ex.message)
    if (await ask('Would you like to try again?')) {
      outPath = await getOutPath()
      writeOutput(outPath, template)
    }
  }
}

module.exports = async () => {
  const basicInfo = await getBasicInfo()
  const modelData = await getModelData()
  const outPath = await getOutPath()

  const template = buildTemplate(basicInfo, modelData)
  await writeOutput(outPath, template)
}
