class Utils{
    static  RetrieveCustomProperties(object) {
        if(object.properties) { //Check if the object has custom properties
            if(Array.isArray(object.properties)) { //Check if from Tiled v1.3 and above
                object.properties.forEach(function(element){ //Loop through each property
                    this[element.name] = element.value; //Create the property in the object
                }, object); //Assign the word "this" to refer to the object
            } else {  //Check if from Tiled v1.2.5 and below
                for(var propName in object.properties) { //Loop through each property
                    object[propName] = object.properties[propName]; //Create the property in the object
                }
            }

            delete object.properties; //Delete the custom properties array from the object
        }

        return object; //Return the new object w/ custom properties
    }
}