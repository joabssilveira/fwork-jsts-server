import express, { Request, Response } from 'express'
import * as core from 'express-serve-static-core'
import { IApiGetResult } from 'fwork-jsts-common/src/api'
import { IWhereOptions } from 'fwork-jsts-db/src'
import { IDbBulkCreateOptions, IDbClientDataSource, IDbCreateOptions, IDbDeleteByKeyOptions, IDbDeleteOptions, IDbGetOptions, IDbUpdateOptions } from 'fwork-jsts-db/src/dbClient'
import { FilterQuery } from 'mongoose'
import { WhereOptions } from 'sequelize'
import { HttpMethods } from '..'

export class ExpressApiUtils {
  static getOptions = <T, TWhereOptions extends WhereOptions<T> | FilterQuery<T> | IWhereOptions<T>>(req: any): IDbGetOptions => {
    const where: TWhereOptions | undefined = req.query.where ? (JSON.parse(req.query.where.toString())) as TWhereOptions : undefined
    const sort: any = req.query.sort ? JSON.parse(req.query.sort) : null
    const select: any = req.query.select
    const exclude: any = req.query.exclude
    const nested: any = req.query.nested
    const page: number | undefined = req.query.page ? Number(req.query.page) : undefined
    const skip: number | undefined = req.query.skip ? Number(req.query.skip) : undefined
    const limit: number | undefined = req.query.limit ? Number(req.query.limit) : undefined

    return {
      where,
      sort,
      select,
      exclude,
      nested,
      page,
      skip,
      limit,
    }
  }

  static deleteOptions = <T, TWhereOptions extends WhereOptions<T> | FilterQuery<T> | IWhereOptions<T>>(req: any) => {
    const where: TWhereOptions | undefined = req.body.where ? (JSON.parse(req.body.where.toString())) as TWhereOptions : undefined

    return {
      where,
    }
  }

  static initPostRoute = <T>(
    args: {
      dataSourceBuilder: () => IDbClientDataSource<T, any,
        IDbBulkCreateOptions<T>, IDbCreateOptions<T>, IDbGetOptions, IDbUpdateOptions<T>, IDbDeleteOptions, IDbDeleteByKeyOptions<any>>
    }
  ) => async (req: Request<core.ParamsDictionary, any, any, core.Query, Record<string, any>>, res: Response<any, Record<string, any>>) => {
    try {
      const data = req.body as T
      res.send(await args.dataSourceBuilder().create({
        data
      }))
    } catch (error: any) {
      res.status(500).send(error.message ?? error)
    }
  }

  static initGetRoute = <T, TWhereOptions extends WhereOptions<T> /**sequelize */ | FilterQuery<T> /**mongoose */ | IWhereOptions<T> /**dbclient */>(
    args: {
      dataSourceBuilder: () => IDbClientDataSource<T, any,
        IDbBulkCreateOptions<T>, IDbCreateOptions<T>, IDbGetOptions, IDbUpdateOptions<T>, IDbDeleteOptions, IDbDeleteByKeyOptions<any>>
    }
  ) => async (req: Request<core.ParamsDictionary, any, any, core.Query, Record<string, any>>, res: Response<any, Record<string, any>>) => {
    try {
      const opt = ExpressApiUtils.getOptions<T, TWhereOptions>(req)
      const result: IApiGetResult<T[]> | undefined = await args.dataSourceBuilder().read(opt)
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
  ) => async (req: Request<core.ParamsDictionary, any, any, core.Query, Record<string, any>>, res: Response<any, Record<string, any>>) => {
    try {
      const data = req.body as T
      let result = await args.dataSourceBuilder().update({
        data
      })
      res.send(result)
    } catch (error: any) {
      res.status(500).send(error.message ?? error)
    }
  }

  static initDeleteRoute = <T, TWhereOptions extends WhereOptions<T> /**sequelize */ | FilterQuery<T> /**mongoose */ | IWhereOptions<T> /**dbclient */>(
    args: {
      dataSourceBuilder: () => IDbClientDataSource<T, any,
        IDbBulkCreateOptions<T>, IDbCreateOptions<T>, IDbGetOptions, IDbUpdateOptions<T>, IDbDeleteOptions, IDbDeleteByKeyOptions<any>>,
    }
  ) => async (req: Request<core.ParamsDictionary, any, any, core.Query, Record<string, any>>, res: Response<any, Record<string, any>>) => {
    try {
      // req.params[key] http://host:port/path/key
      // req.query[key] http://host:port/path?key=value
      const ds = args.dataSourceBuilder()
      const keyValue = req.params['key'] || req.query['key']
      const opt = ExpressApiUtils.deleteOptions<T, TWhereOptions>(req)
      if (keyValue && opt.where) {
        res.status(400).send()
        return
      }
      const deleteReponse = await ds.delete({
        where: keyValue ? {
          [ds.keyName]: keyValue
        } : opt.where
      })
      res.status(200).send({
        deletedCount: deleteReponse
      })
    } catch (error: any) {
      res.status(500).send(error.message ?? error)
    }
  }

  static initRoutes = <T, TGetOptions extends WhereOptions<T> | FilterQuery<T>, TDeleteOptions extends WhereOptions<T> | FilterQuery<T>>
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
      route.get(args.path, ExpressApiUtils.initGetRoute<T, TGetOptions>({
        dataSourceBuilder: args.dataSourceBuilder
      }))

    if (put)
      route.put(args.path, ExpressApiUtils.initPutRoute<T>({
        dataSourceBuilder: args.dataSourceBuilder
      }))

    if (remove) {
      route.delete(`${args.path}/:key`, ExpressApiUtils.initDeleteRoute<T, TDeleteOptions>({
        dataSourceBuilder: args.dataSourceBuilder,
      }))
    }
    return route
  }
}