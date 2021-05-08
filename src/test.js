export  function testFunction(x){
    console.log('this is test function', x)
    anotherFunction(x)
}


function anotherFunction(asdf){
    console.log('Another Function', asdf);
}