/**
 * CloudFront types
 */

/**
 * CloudFront header interface
 */
export interface ICloudFrontHeader {
  key?: string;
  value: string;
}

/**
 * CloudFront headers interface
 */
export interface ICloudFrontHeaders {
  [name: string]: ICloudFrontHeader[];
}

/**
 * CloudFront request interface
 */
export interface ICloudFrontRequest {
  uri: string;
  querystring: string;
  headers: ICloudFrontHeaders;
  method?: string;
}

/**
 * CloudFront response interface
 */
export interface ICloudFrontResponse {
  status?: string;
  statusDescription?: string;
  headers: ICloudFrontHeaders;
  body?: string;
}

/**
 * CloudFront event interface
 */
export interface ICloudFrontEvent {
  Records: Array<{
    cf: {
      config: {
        eventType: 'viewer-request' | 'viewer-response' | 'origin-request' | 'origin-response';
      };
      request: ICloudFrontRequest;
      response?: ICloudFrontResponse;
    };
  }>;
}
