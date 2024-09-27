import dotenv from 'dotenv'
dotenv.config()

export interface IExpressApiSettings {
  httpProtocols?: string | undefined,
  httpPort?: number | undefined,
  httpsPort?: number | undefined,
  httpsCertKeyFile?: string | undefined,
  httpsCertPemFile?: string | undefined
}

export const expressApiEnv: IExpressApiSettings = {
  httpProtocols: process.env.HTTP_PROTOCOLS,
  httpPort: process.env.HTTP_PORT as unknown as number,
  httpsPort: process.env.HTTPS_PORT as unknown as number,
  httpsCertKeyFile: process.env.HTTPS_CERT_KEY_FILE,
  httpsCertPemFile: process.env.HTTPS_CERT_PEM_FILE
}