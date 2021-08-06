var express = require('express')
var app = express();
app.get('/getData/make/:MakeParam/engine/:EngineParam', (req, res) => {
//mainigie  tekoshajai rindai un resultatu masivs
    var rowObject = new Object();
    var resultsJSON = new Array();
//defineti mainigie regexp veidosanai un ī ļ problemas risinahanai
    var make = req.params.MakeParam;
    var engine = req.params.EngineParam;
//neatkarigi no ta vai ir ī vai ļ vai i un l , chars tiek aizvietoti uz ļ un ī ; lazy option
//pectam par uppercase i pievieno lai ir uppercase insensitive

    if(engine.length <= 7){
        var temp = engine.split('');
        temp.splice(4,1, 'ī');
        var engineReplaced = temp.join('');
    
    }else{
        var temp = engine.split('');
        temp.splice(1,1, 'ī');
	temp.splice(4,1, 'ļ');
        var engineReplaced = temp.join('');
    }
    var regexpMake= new RegExp(make,'giu');
    var regexpEngine = new RegExp(engineReplaced,'giu');
// papildus library, lai tiktu galā ar csv failu: npm  csv-parse //r
    var fs = require('fs');
    var parse = require('csv-parse');
    fs.createReadStream(__dirname+'/ta2017c.lst')
        .pipe(parse({ delimiter:";",bom:true,relax_column_count: true}))
        .on('data',function(csvRow){

            if (regexpMake.test(csvRow) === true && regexpEngine.test(csvRow) === true){
                rowObject = csvRow;
                resultsJSON.push(rowObject);
            }
        })
        .on('end',function(){
            var endResults = JSON.parse(JSON.stringify(resultsJSON));
            res.send(endResults);
        })
});
var server = app.listen(8000,'192.168.119.39', function () {
    var host = server.address().address
    var port = server.address().port
    console.log('Example app listening on port 8000!',host, port)
})
