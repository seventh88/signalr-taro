import * as Taro from "@tarojs/taro";
import { HttpClient } from "./HttpClient";
import { ILogger, LogLevel } from "./ILogger";
import { ITransport, TransferFormat } from "./ITransport";
import { Arg, getDataDetail } from "./Utils";

export class TaroWebSocketTransport implements ITransport {

    private _webSocket: Taro.SocketTask | undefined;
    constructor(
        private readonly _httpClient: HttpClient,
        private readonly _accessTokenFactory: (() => string | Promise<string>) | undefined,
        private readonly _logger: ILogger,
        private readonly _logMessageContent: boolean) {

    }

    public async connect(url: string, transferFormat: TransferFormat): Promise<void> {
        Arg.isRequired(url, "url");
        Arg.isRequired(transferFormat, "transferFormat");
        Arg.isIn(transferFormat, TransferFormat, "transferFormat");
        this._logger.log(LogLevel.Trace, "(WebSockets transport) Connecting.");

        if (this._accessTokenFactory) {
            const token = await this._accessTokenFactory();
            if (token) {
                url += (url.indexOf("?") < 0 ? "?" : "&") + `access_token=${encodeURIComponent(token)}`;
            }
        }
        return new Promise<void>((resolve, reject) => {
            url = url.replace(/^http/, "ws");
            const cookies = this._httpClient.getCookieString(url);
            Taro.connectSocket({
                url,
                header: {
                    cookie: cookies ? `${cookies}` : undefined,
                },
                fail: (e: TaroGeneral.CallbackResult) => {
                    this._logger.log(LogLevel.Information, `WebSocket connected to ${url} Failed:${e.errMsg}`);
                    reject(e.errMsg);
                }
            }).then((webSocket) => {
                webSocket.onOpen(() => {
                    this._logger.log(LogLevel.Information, `WebSocket connected to ${url}.`);
                    this._webSocket = webSocket;
                    resolve();
                });

                webSocket.onError((event) => {
                    this._logger.log(LogLevel.Error, `There was an error with the transport: ${event.errMsg}`);
                    reject(new Error(event.errMsg || "There was an error with the transport."));
                });

                webSocket.onMessage((message) => {
                    this._logger.log(LogLevel.Trace, `(WebSockets transport) data received. ${getDataDetail(message.data, this._logMessageContent)}.`);
                    if (this.onreceive) {
                        this.onreceive(message.data);
                    }
                });

                webSocket.onClose((event: any) => this.close(event));
            }).catch(error => {
                this._logger.log(LogLevel.Error, `connectSocket Error: ${error.errMsg || error}`);
                reject(error.errMsg);
            });
        })


    }
    public onreceive: ((data: string | ArrayBuffer) => void) | null = null;
    public onclose: ((error?: Error | undefined) => void) | null = null;

    public send(data: any): Promise<void> {
        if (this._webSocket) {
            this._logger.log(LogLevel.Trace, `(WebSockets transport) sending data. ${getDataDetail(data, this._logMessageContent)}.`);
            this._webSocket.send({ data });
            return Promise.resolve();
        }

        return Promise.reject("WebSocket is not in the OPEN state");
    }

    public stop(): Promise<void> {
        if (this._webSocket) {
            // Clear websocket handlers because we are considering the socket closed now
            this._webSocket = undefined;

            // Manually invoke onclose callback inline so we know the HttpConnection was closed properly before returning
            // This also solves an issue where websocket.onclose could take 18+ seconds to trigger during network disconnects
            this.close(undefined);
        }

        return Promise.resolve();
    }

    public close(event?: any): void {
        // webSocket will be null if the transport did not start successfully
        this._logger.log(LogLevel.Trace, "(WebSockets transport) socket closed.");
        if (this.onclose) {
            if (event && event.code !== 1000) {
                this.onclose(new Error(`WebSocket closed with status code: ${event.code} (${event.reason}).`));
            } else {
                this.onclose();
            }
        }
    }
}
