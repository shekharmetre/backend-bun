import { db, prisma } from '@/config/database';
import { ApiResponse } from '@/utils/apiResponse'
import { safeQuery } from '@/utils/safequery';
import { Elysia, t } from 'elysia'

export const testApis = new Elysia({ prefix: '/test' })

    .get("/first", async () => {
        try {

           const user = await prisma.user.findUnique({where:{email:"metreshekhar249@gmail.com"}})
            console.log(user)
            return ApiResponse.success(user, 200)
        } catch (error) {
            console.log(error)
            return ApiResponse.error(error, 501)
        }
    })