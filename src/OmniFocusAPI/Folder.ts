
import { ApplyResult } from "./ApplyResult"
import { FolderArray } from "./FolderArray"
import { FolderChildInsertionLocation } from "./FolderChildInsertionLocation"
import { FolderStatus } from "./FolderStatus"
import { Project } from "./Project"
import { ProjectArray } from "./ProjectArray"
import { SectionArray } from "./SectionArray"

export interface Folder
{
    // Folders

    // Folders provide a convenient mechanism for organizing your projects. Each folder may contain other folders and projects, and you copy and move their contents between folders.
    // Class Functions
    
        byIdentifier(identifier: String):Folder; // null if (not.// Returns the Folder with the specified identifier, or null if (no such folder exists.
    
    // Using the byIdentifier() method to locate a folder using the value of its primaryKey property (object ID)
{
    // Locating Folder by ID
    
    
    
    // Folder.byIdentifier('a0UDF6AROY8')
    //--> [object Folder: Home Renovation]
    
    // Using the flattenedFolders property of the Database class and the byName(…) function of the SectionArray class to return an object reference to the first folder identified by name) {

    // Instance Properties
    
    // Here are the properties of an instance of the Folder class) {    
        after ():FolderChildInsertionLocation;// const// Returns a location refering to position just after this folder.
    
        before ():FolderChildInsertionLocation;// const// Returns a location refering to position just before this folder.
    
        beginning ():FolderChildInsertionLocation;// const// Returns a location refering to the beginning of the contained projects and folders in this folder.
    
        ending ():FolderChildInsertionLocation;// const// Returns a location refering to the ending of the contained projects and folders in this folder.
    
        children ():any[];// const// Returns a sorted list of the folders and projects contained within this folder.

        folders ():Folder[];// const// Returns the child folders of this folder.
    
        flattenedChildren ():SectionArray;// const// An alias for flattenedSections.
    
        flattenedFolders ():FolderArray;// const// Returns a flat array of all folders in this folder, sorted by their order in the database.
    
        flattenedProjects ():ProjectArray;// const// Returns a flat array of all projects in this folder, sorted by their order in the database.
    
        flattenedSections ():SectionArray;// const// Returns a flat array of all folders and project in this folder, sorted by their order in the database.
    
        name ():String;// The name of the folder.
    
        parent ():Folder;// const// null if (not.// The parent Folder which contains this folder.

        projects ():Project[];// const// Returns the projects contained directly as children of this folder.
    
        sections ():any[];// An Array containing Project and Folder objects. Works with the byName(…) function to return the first Project or Folder contained directly in this array with the given name.
    
        status ():FolderStatus;// The folder’s status.
    
    // Using the flattenedProjects property of the Folder class to iterate all projects within a specified folder) {    

    
    // Folder.Status Class
    
    // The value for the status property of the Folder class) {    
    //     Active (Folder.Status);// const// The folder is active.
    
    //     Dropped (Folder.Status);// const// The folder has been dropped.
    
    //     all (Array of Folder.Status);// const// An array of all items of this enumeration.
    

    
    // Folder Instance Functions
    
    // Here are the functions that can be applied to instances of the Folder class) {    
        folderNamed(name:String):Folder; // null if (not.// Returns the first child folder of this folder with the given name, or null.
    
        projectNamed(name:String):Folder; // null if (not.// Returns the first child project of this folder with the given name, or null.
    
        apply(func:Function):ApplyResult; // null if (not.// Calls the given function for this Folder and recursively into any child folders and projects. The tasks within any projects are not descended into.
    
    // For referencing specific folders within a folder hierarchy, use chained folderNamed() functions) {    

    
    // NOTE: The Finding Items section contains examples of using global search functions like foldersMatching(…) to locate items specified by the values of their properties.
    // Folder Hierarchy
    
    // Folders may contain projects and other folders. Contained folders may also contain folders and projects, and so on.
    
    // Here's a macOS-only function that will return the path string to the selected library item (folder or project), for example) {}