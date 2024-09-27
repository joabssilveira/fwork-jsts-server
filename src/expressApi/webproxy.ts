import axios from 'axios';
import express, { Request, Response } from 'express';
import FormData from 'form-data';
import fs from 'fs';
import multer from 'multer';

const route = express.Router()
route.use(express.json());

// Configuração do multer para upload de arquivos
const upload = multer({ dest: 'uploads/' });

// Função auxiliar para redirecionar a requisição
const proxyRequest = async (req: Request, res: Response, method: 'get' | 'post' | 'put' | 'delete') => {
  const url = req.params[0]; // Captura o restante da URL passada
  const targetUrl = `http://myserverhost/${url}`; // Monta a URL de destino

  try {
    let response;

    // Se for POST ou PUT e conter arquivos, cria um FormData
    if (method === 'post' || method === 'put') {
      if (req.files) {
        const formData = new FormData();

        // Adiciona os arquivos ao FormData
        const files = req.files as Express.Multer.File[];
        files.forEach(file => {
          formData.append('files', fs.createReadStream(file.path), file.originalname);
        });

        // Adiciona o corpo da requisição (se houver)
        if (req.body) {
          Object.keys(req.body).forEach(key => {
            formData.append(key, req.body[key]);
          });
        }

        // Define o cabeçalho adequado para envio do FormData
        const headers = formData.getHeaders();

        // Faz a requisição com os arquivos
        response = await axios({
          method,
          url: targetUrl,
          data: formData,
          headers,
        });

        // Remove os arquivos temporários
        files.forEach(file => fs.unlinkSync(file.path));
      } else {
        // Se não houver arquivos, faz a requisição normal
        response = await axios({
          method,
          url: targetUrl,
          data: req.body,
        });
      }
    } else {
      // Para GET ou DELETE, faz a requisição sem arquivos
      response = await axios({
        method,
        url: targetUrl,
        params: req.query,
      });
    }

    // Retorna a resposta recebida do servidor de destino
    res.status(response?.status || 200).send(response?.data);
  } catch (error) {
    // Lida com erros e retorna a resposta de erro
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).send('Erro desconhecido no proxy.');
    }
  }
};

// Endpoint GET
route.get('/proxy/*', (req: Request, res: Response) => {
  proxyRequest(req, res, 'get');
});

// Endpoint POST com upload de múltiplos arquivos
route.post('/proxy/*', upload.array('files'), (req: Request, res: Response) => {
  proxyRequest(req, res, 'post');
});

// Endpoint PUT com upload de múltiplos arquivos
route.put('/proxy/*', upload.array('files'), (req: Request, res: Response) => {
  proxyRequest(req, res, 'put');
});

// Endpoint DELETE
route.delete('/proxy/*', (req: Request, res: Response) => {
  proxyRequest(req, res, 'delete');
});

export { route as expressWebproxyRoutes };

