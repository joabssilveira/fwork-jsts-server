import express, { Request, Response } from 'express'
import { Where, ApiRequestDeleteOptions, ApiRequestGetOptions, ApiRequestPostOptions, ApiRequestPutOptions, ApiResponseDeleteData, ApiResponseGetListData, ApiResponsePostData, ApiResponsePutData } from 'fwork-jsts-common'
import { IDbBulkCreateOptions, IDbClientDataSource, IDbCreateOptions, IDbDeleteByKeyOptions, IDbDeleteOptions, IDbGetOptions, IDbUpdateOptions } from 'fwork-jsts-db'
import { HttpMethods } from '..'

export class ExpressApiUtils {
  static requestGetOptions = <T, TWhere extends Where<T>>(req: Request): ApiRequestGetOptions<T, TWhere> => {
    const result: ApiRequestGetOptions<T, TWhere> = {
      where: req.query.where ? (JSON.parse(req.query.where.toString())) as TWhere : undefined,
      sort: req.query.sort ? JSON.parse((req.query as any).sort) : null,
      select: req.query.select,
      exclude: req.query.exclude,
      nested: req.query.nested,
      page: req.query.page ? Number(req.query.page) : undefined,
      skip: req.query.skip ? Number(req.query.skip) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }

    return result
  }

  static requestDeleteOptions = <T, TWhere extends Where<T>>(req: Request): ApiRequestDeleteOptions<T, TWhere> => {
    const result: ApiRequestDeleteOptions<T, TWhere> = {
      where: req.body.where ? (JSON.parse(req.body.where.toString())) as TWhere : undefined
    }

    return result
  }

  static initPostRoute = <T>(
    args: {
      dataSourceBuilder: () => IDbClientDataSource<T, any,
        IDbBulkCreateOptions<T>, IDbCreateOptions<T>, IDbGetOptions, IDbUpdateOptions<T>, IDbDeleteOptions, IDbDeleteByKeyOptions<any>>
    }
  ) => async (req: Request, res: Response) => {
    try {
      const opt = req.body as ApiRequestPostOptions<T>
      const result: ApiResponsePostData<T> | undefined = await args.dataSourceBuilder().create({
        data: opt
      })
      res.send(result)
    } catch (error: any) {
      res.status(500).send(error.message ?? error)
    }
  }

  static initGetRoute = <T, TWhere extends Where<T>>(
    args: {
      dataSourceBuilder: () => IDbClientDataSource<T, any,
        IDbBulkCreateOptions<T>, IDbCreateOptions<T>, IDbGetOptions, IDbUpdateOptions<T>, IDbDeleteOptions, IDbDeleteByKeyOptions<any>>
    }
  ) => async (req: Request, res: Response) => {
    try {
      const opt = ExpressApiUtils.requestGetOptions<T, TWhere>(req)
      const result: ApiResponseGetListData<T> | undefined = await args.dataSourceBuilder().read(opt)
      res.send(result)
    } catch (error: any) {
      res.status(500).send(error.message ?? error)
    }
  }

  static initPutRoute = <T>(
    args: {
      dataSourceBuilder: () => IDbClientDataSource<T, any,
        IDbBulkCreateOptions<T>, IDbCreateOptions<T>, IDbGetOptions, IDbUpdateOptions<T>, IDbDeleteOptions, IDbDeleteByKeyOptions<any>>
    }
  ) => async (req: Request, res: Response) => {
    try {
      const opt = req.body as ApiRequestPutOptions<T>
      const result: ApiResponsePutData<T> | undefined = await args.dataSourceBuilder().update({
        data: opt
      })
      res.send(result)
    } catch (error: any) {
      res.status(500).send(error.message ?? error)
    }
  }

  static initDeleteRoute = <T, TWhere extends Where<T>>(
    args: {
      dataSourceBuilder: () => IDbClientDataSource<T, any,
        IDbBulkCreateOptions<T>, IDbCreateOptions<T>, IDbGetOptions, IDbUpdateOptions<T>, IDbDeleteOptions, IDbDeleteByKeyOptions<any>>,
    }
  ) => async (req: Request, res: Response) => {
    try {
      // req.params[key] http://host:port/path/key
      // req.query[key] http://host:port/path?key=value
      const ds = args.dataSourceBuilder()
      const keyValue = req.params['key'] || req.query['key']
      const opt = ExpressApiUtils.requestDeleteOptions<T, TWhere>(req)
      if (keyValue && opt.where) {
        res.status(400).send()
        return
      }
      const deleteReponse = await ds.delete({
        where: keyValue ? {
          [ds.keyName]: keyValue
        } : opt.where
      })

      const result: ApiResponseDeleteData = {
        deletedCount: deleteReponse
      }
      res.status(200).send(result)
    } catch (error: any) {
      res.status(500).send(error.message ?? error)
    }
  }

  static initRoutes = <T, TGetWhere extends Where<T>, TDeleteWhere extends Where<T>>
    (args: {
      path: string,
      dataSourceBuilder: () => IDbClientDataSource<T, any,
        IDbBulkCreateOptions<T>, IDbCreateOptions<T>, IDbGetOptions, IDbUpdateOptions<T>, IDbDeleteOptions, IDbDeleteByKeyOptions<any>>,
      methods?: HttpMethods[]
    }) => {
    var post, get, put, remove

    if (args.methods?.length) {
      post = args.methods.indexOf(HttpMethods.post) != -1
      get = args.methods.indexOf(HttpMethods.get) != -1
      put = args.methods.indexOf(HttpMethods.put) != -1
      remove = args.methods.indexOf(HttpMethods.delete) != -1
    }
    else {
      post = true
      get = true
      put = true
      remove = true
    }

    const route = express.Router()
    if (post)
      route.post(args.path, ExpressApiUtils.initPostRoute<T>({
        dataSourceBuilder: args.dataSourceBuilder
      }))

    if (get)
      route.get(args.path, ExpressApiUtils.initGetRoute<T, TGetWhere>({
        dataSourceBuilder: args.dataSourceBuilder
      }))

    if (put)
      route.put(args.path, ExpressApiUtils.initPutRoute<T>({
        dataSourceBuilder: args.dataSourceBuilder
      }))

    if (remove) {
      route.delete(`${args.path}/:key`, ExpressApiUtils.initDeleteRoute<T, TDeleteWhere>({
        dataSourceBuilder: args.dataSourceBuilder,
      }))
    }
    return route
  }
}