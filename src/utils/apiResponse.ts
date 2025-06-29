export class ApiResponse {
  static success(data: any, status = 200,route?:string) {

    return { status, success: true, data };
  }

  static error(message: string | any, status = 500,route?:string) {

    return { status, success: false, error: message };
  }
}
