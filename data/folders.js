const {ObjectId}=require('mongodb')
const mongoCollections = require('../config/mongoCollections');
const users=mongoCollections.users
const validation=require('../validation')

function fn(str){       //adds leading 0 to 1 digit time numbers
    if(str.toString().length===1) str='0'+str.toString();
    return str
}

const createFolder = async(username,folderName) => {        //same idea as createDeck, but we only need to deal with adding folders to one person
    username=validation.checkUsername(username)
    folderName=validation.checkFolderName(folderName)

    const userCollection=await users();
    const folderCreator=await userCollection.findOne({username:username})
    for(folder of folderCreator.folders)
        if(folder.name.toLowerCase()===folderName.toLowerCase()) 
            throw "You already have a folder named "+folderName
    let d=new Date()
    let newFolder={
        _id:ObjectId().toString(),
        name:folderName,
        dateCreated: `${d.getFullYear()}-${fn(d.getMonth()+1)}-${fn(d.getDate())} ${fn(d.getHours())}:${fn(d.getMinutes())}:${fn(d.getSeconds())}`,
        decks:[]            //contains deck id's
    }
    const insertFolder=await userCollection.updateOne(
        {username:username},
        {$push: {"folders":newFolder}}
    )
    if(insertFolder.modifiedCount===0) throw "Could not successfully add folder"
    return newFolder
}

const deleteFolder=async(username,folderId) => {        //deletes folder from array of subdocuments in user.
    username=validation.checkUsername(username)
    folderId=validation.checkId(folderId)
    const userCollection=await users();
    const updatedUser=await userCollection.updateOne(
        {username:username},
        {$pull: {"folders": {"_id":folderId}}}
    )
    if(updatedUser.modifiedCount===0) throw "Could not delete folder"
    return updatedUser
}

const editFolder=async(username,folderId,newFolderName) => {        //renaming a folder
    username=validation.checkUsername(username)
    folderId=validation.checkId(folderId)
    newFolderName=validation.checkFolderName(newFolderName);
    const userCollection=await users();
    const folderCreator=await userCollection.findOne({username:username})
    for(folder of folderCreator.folders)            //makes sure the new name is not the existing name of a folder
        if(folder.name.toLowerCase()===newFolderName.toLowerCase()) 
            throw "You already have a folder named "+newFolderName
    
    const editedFolder=userCollection.updateOne(
        {username:username,"folders._id":folderId},
        {$set: {"folders.$.name":newFolderName}}            //changes just the folder's name
    )
    if(editedFolder.modifiedCount===0) throw "Unable to edit folder"
    return await getFolderById(username,folderId)
}

const getFolderById=async(username,folderId) => {
    username=validation.checkUsername(username)
    folderId=validation.checkId(folderId)
    const userCollection=await users()
    const folderFromId=await userCollection.findOne(
        {username:username,
         folders:{$elemMatch:{_id:folderId}}},
        {projection:{"folders.$":1}}
    )
    const folderFound=folderFromId.folders[0]
    if(!folderFound) throw "Unable to find that folder"
    return folderFound
}

const addDeckToFolder=async(username,folderId,deckId) => {      //add deck (deckId) to user's (username) folder (folderId)
    username=validation.checkUsername(username)
    folderId=validation.checkId(folderId)
    deckId=validation.checkId(deckId)
    const userCollection=await users()
    let folder=await getFolderById(username,folderId)
    if(folder.decks.includes(deckId)) throw "That deck is already in that folder"       //just checking by deckIds
    const updatedFolder=await userCollection.updateOne(
        {username:username,"folders._id":folderId},
        {$push: {"folders.$.decks":deckId}}
    )
    if(updatedFolder.modifiedCount===0) throw "Unable to add deck to folder"
    return await getFolderById(username,folderId)
}

const removeDeckFromFolder=async(username,folderId,deckId) => {     //remove deck (deckId) from user's (username) folder (folderId)
    username=validation.checkUsername(username)
    folderId=validation.checkId(folderId)
    deckId=validation.checkId(deckId)
    const userCollection=await users()      
    const existingDecks=(await getFolderById(username,folderId)).decks      //those parentheses need to be there
    if(!existingDecks.find(id => id===deckId)) throw "That deck is not in that folder"      //find searches for an id in the folder equal to deckId
    const updatedFolder=await userCollection.updateOne(
        {username:username,"folders._id":folderId},
        {$pull: {"folders.$.decks":deckId}}
    )
    if(updatedFolder.modifiedCount===0) throw "Unable to remove deck from folder"
    return await getFolderById(username,folderId)
}

module.exports = {
    createFolder,
    deleteFolder,
    editFolder,
    getFolderById,
    addDeckToFolder,
    removeDeckFromFolder
}