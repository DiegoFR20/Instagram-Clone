var express = require('express'),
    bodyParser = require('body-parser'),
    multiparty = require('connect-multiparty'),
    mongodb = require('mongodb').MongoClient,
    objectID = require('mongodb').ObjectId,
    fs = require('fs');

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(multiparty());

app.listen(8080);

var dbName = 'instagram';
var mongoURL = 'mongodb+srv://DiegoFR:Freire15.@cluster0-wlpz2.mongodb.net/instagram?retryWrites=true&w=majority';

var connDb = function (data) {
    mongodb.connect(mongoURL, { useNewUrlParser: true }, function (err, client) {
        var db = client.db(dbName);
        query(db, data);
        client.close();
    });
}

function query(db, data) {
    var collection = db.collection(data.collection);
    switch (data.operacao) {
        case 'atualizar':
            collection.update(data.where, data.set);
            break;
        case 'inserir':
            collection.insertOne(data.dados, data.callback);
            break;
        case 'pesquisar':
            collection.find(data.dados).toArray(data.callback);
            break;
        case 'remover':
            data.where._id = objectID(data.where._id);
            collection.remove(data.where, data.callback);
            break;
    }
}

app.get('/', function (req, res) {
    res.send({ msg: 'Olá' });
});


app.get('/api', function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    var data = req.body;
    var dados = {
        operacao: 'pesquisar',
        dados: data,
        collection: 'postagens',
        callback: function (err, records) {
            if (err) {
                res.send(err);
            } else {
                res.json(records);
            }
        }
    }
    connDb(dados);
});

app.get('/imagens/:imagem', function (req, res) {
    var img = req.params.imagem;

    fs.readFile('./uploads/' + img, function (err, content) {
        if (err) {
            res.status(400).json(err);
            return;
        }

        res.writeHead(200, { 'content-type': 'image/jpg' });
        res.end(content);
    });
});


app.post('/api', function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    var data = req.body;
    var date = new Date();
    timeStamp = date.getTime();
    var urlImagem = timeStamp + '_' + req.files.arquivo.originalFilename;
    var caminhoOrigem = req.files.arquivo.path;
    var caminhoDestino = './uploads/' + urlImagem;
    var readS = fs.createReadStream(caminhoOrigem);
    var writeS = fs.createWriteStream(caminhoDestino);

    readS.pipe(writeS);

    readS.on("end", function (error) {
        if (error) {
            res.status(500).json({ error: error });
            return;
        }

        data = {
            urlImagem: urlImagem,
            titulo: req.body.titulo
        }

        var dados = {
            operacao: 'inserir',
            dados: data,
            collection: 'postagens',
            callback: function (err, records) {
                if (err) {
                    res.send('Erro');
                } else {
                    res.send('Inclusão realizada com sucesso');
                }
            }
        }
        connDb(dados);
    });
    fs.unlink(caminhoOrigem, function (error) {
        if (error) throw error;
        console.log('File deleted!');
    });
});