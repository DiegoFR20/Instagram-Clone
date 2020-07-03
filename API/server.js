var express = require('express'),
    bodyParser = require('body-parser'),
    multiparty = require('connect-multiparty'),
    mongodb = require('mongodb').MongoClient,
    ObjectId = require('mongodb').ObjectId,
    fs = require('fs');

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(multiparty());

app.use(function (req, res, next) {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Credentials", true);

    next();
});

app.listen(8080);

var dbName = 'instagram';
var mongoURL = 'mongodb+srv://DiegoFR:Freire15.@cluster0-wlpz2.mongodb.net/probono?authSource=admin&replicaSet=Cluster0-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass%20Community&retryWrites=true&ssl=true';

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
            collection.updateOne(data.where, data.set);
            break;
        case 'inserir':
            collection.insertOne(data.dados, data.callback);
            break;
        case 'pesquisar':
            collection.find(data.dados).toArray(data.callback);
            break;
        case 'removerComentario':
            collection.updateOne(
                {},
                {
                    $pull: {
                        comentarios: { idComentario: ObjectId(data.data) }
                    }
                },
                { multi: true }
            );
            break;
    }
}

app.get('/', function (req, res) {
    res.send({ msg: 'Olá' });
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

app.get('/api', function (req, res) {
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

app.get('/api/:id', function (req, res) {
    var data = req.params.id;
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

app.post('/api', function (req, res) {
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

app.put('/api/:id', function (req, res) {
    var comentario = req.body.comentario,
        id = ObjectId(req.params.id),
        idComentario = new ObjectId();

    var dados = {
        operacao: 'atualizar',
        where: { _id: id },
        set: {
            $push: {
                comentarios: {
                    idComentario: idComentario,
                    comentario: comentario
                }
            }
        },
        collection: 'postagens',
        callback: function (error, records) {
            if (error) res.send(error);
            res.json(records);
        }
    }
    connDb(dados);
});

app.delete('/api/:id', function (req, res) {
    var id = req.params.id;
    var dados = {
        operacao: 'removerComentario',
        data: id,
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