import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MainServerClientService } from '../services/main-server-client.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly mainServerUrl: string;
  private readonly mainFrontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly mainServerClient: MainServerClientService,
  ) {
    this.mainServerUrl = this.configService.get<string>('MAIN_SERVER_URL') || '';
    this.mainFrontendUrl = this.configService.get<string>('MAIN_FRONTEND_URL') || '';
    
    // Log configuration for debugging
    if (!this.mainServerUrl) {
      this.logger.warn('MAIN_SERVER_URL is not configured');
    } else {
      this.logger.log(`Main server URL configured: ${this.mainServerUrl}`);
    }
  }

  /**
   * Initiate SSO login flow
   * Returns the SSO initiation URL (frontend URL, not backend)
   * User should NOT see backend URL
   */
  initiateLogin(redirectUri: string, service?: string): string {
    const serviceName = service || this.configService.get<string>('SERVICE_NAME') || 'external-service';
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    
    // Redirect to FRONTEND, not backend - user should NOT see backend URL
    const frontendUrl = this.mainFrontendUrl || this.mainServerUrl.replace('/api', '');
    const ssoUrl = `${frontendUrl}/sso/initiate?redirect_uri=${encodedRedirectUri}&service=${serviceName}`;
    
    this.logger.log(`Initiating SSO login for service: ${serviceName}, redirecting to frontend: ${ssoUrl}`);
    return ssoUrl;
  }

  /**
   * Handle SSO callback - exchange code for service token
   */
  async handleCallback(
    code: string,
    redirectUri: string,
  ): Promise<{ serviceToken: string; userId: number; serviceName: string }> {
    // Log incoming parameters
    this.logger.log('=== SSO Exchange Request Started ===');
    this.logger.log(`Input code: ${code ? `${code.substring(0, 10)}...${code.substring(code.length - 5)} (length: ${code.length})` : 'empty'}`);
    this.logger.log(`Input redirectUri (raw): ${redirectUri}`);
    
    // Decode redirect_uri if it's URL-encoded
    let decodedRedirectUri = redirectUri;
    try {
      if (redirectUri.includes('%')) {
        decodedRedirectUri = decodeURIComponent(redirectUri);
        this.logger.log(`Decoded redirectUri: ${decodedRedirectUri}`);
      } else {
        this.logger.log(`RedirectUri is not URL-encoded, using as-is: ${decodedRedirectUri}`);
      }
    } catch (decodeError: any) {
      this.logger.warn(`Failed to decode redirectUri: ${decodeError.message}, using original`);
      decodedRedirectUri = redirectUri;
    }
    
    try {
      const url = `${this.mainServerUrl}/auth/sso/exchange`;
      const requestPayload = {
        code,
        redirect_uri: decodedRedirectUri,
      };
      
      this.logger.log(`=== Request Details ===`);
      this.logger.log(`Target URL: ${url}`);
      this.logger.log(`HTTP Method: POST`);
      this.logger.log(`Request Payload: ${JSON.stringify({
        code: `${code.substring(0, 10)}...${code.substring(code.length - 5)}`,
        redirect_uri: decodedRedirectUri,
      })}`);
      this.logger.log(`Code length: ${code.length} characters`);
      this.logger.log(`Redirect URI length: ${decodedRedirectUri.length} characters`);
      
      const startTime = Date.now();
      this.logger.log(`Sending request to main server...`);
      
      const response = await firstValueFrom(
        this.httpService.post(url, requestPayload),
      );
      
      const duration = Date.now() - startTime;
      this.logger.log(`=== Response Received (${duration}ms) ===`);
      this.logger.log(`HTTP Status: ${response.status} ${response.statusText}`);
      this.logger.log(`Response Headers: ${JSON.stringify(response.headers)}`);
      this.logger.log(`Response Data: ${JSON.stringify(response.data)}`);
      
      if (response.data?.data?.serviceToken) {
        const { serviceToken, userId, serviceName } = response.data.data;
        
        this.logger.log(`=== SSO Exchange Successful ===`);
        this.logger.log(`Service Token: ${serviceToken ? `${serviceToken.substring(0, 20)}...${serviceToken.substring(serviceToken.length - 10)} (length: ${serviceToken.length})` : 'empty'}`);
        this.logger.log(`User ID: ${userId}`);
        this.logger.log(`Service Name: ${serviceName || 'not provided'}`);
        
        // Set token in MainServerClientService for future requests
        this.mainServerClient.setToken(serviceToken);
        this.logger.log(`Service token stored in MainServerClientService`);
        
        this.logger.log('=== SSO Exchange Request Completed Successfully ===');
        
        return {
          serviceToken,
          userId,
          serviceName,
        };
      }

      this.logger.warn(`=== Invalid Response Format ===`);
      this.logger.warn(`Response structure: ${JSON.stringify({
        hasData: !!response.data,
        hasDataData: !!response.data?.data,
        hasServiceToken: !!response.data?.data?.serviceToken,
        responseKeys: response.data ? Object.keys(response.data) : [],
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
      })}`);
      this.logger.warn(`Full response data: ${JSON.stringify(response.data)}`);
      
      throw new Error('Invalid response from SSO exchange endpoint');
    } catch (error: any) {
      this.logger.error('=== SSO Exchange Request Failed ===');
      
      if (error.response) {
        // Axios error with response
        const status = error.response.status;
        const statusText = error.response.statusText;
        const url = error.config?.url || 'unknown';
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
        const requestData = error.config?.data ? JSON.parse(error.config.data) : null;
        const responseData = error.response.data;
        const responseHeaders = error.response.headers;
        
        this.logger.error(`HTTP Error Details:`);
        this.logger.error(`  Status: ${status} ${statusText}`);
        this.logger.error(`  URL: ${method} ${url}`);
        this.logger.error(`  Request Payload: ${JSON.stringify(requestData)}`);
        this.logger.error(`  Response Data: ${JSON.stringify(responseData)}`);
        this.logger.error(`  Response Headers: ${JSON.stringify(responseHeaders)}`);
        
        if (status === 400) {
          this.logger.error(`Bad Request - Possible reasons:`);
          this.logger.error(`  1. Code is invalid or expired: ${requestData?.code ? `${requestData.code.substring(0, 10)}...` : 'missing'}`);
          this.logger.error(`  2. Redirect URI mismatch: ${requestData?.redirect_uri || 'missing'}`);
          this.logger.error(`  3. Code already used or expired`);
        } else if (status === 404) {
          this.logger.error(`Not Found - Endpoint does not exist at: ${url}`);
          this.logger.error(`  Check if MAIN_SERVER_URL is correct: ${this.mainServerUrl}`);
          this.logger.error(`  Verify endpoint exists: ${this.mainServerUrl}/auth/sso/exchange`);
        } else if (status === 401) {
          this.logger.error(`Unauthorized - Authentication failed`);
        } else if (status === 500) {
          this.logger.error(`Internal Server Error - Main server error`);
        }
        
        throw new Error(
          `Failed to exchange SSO code: HTTP ${status} ${statusText}. ${responseData?.message || error.message}`,
        );
      } else if (error.request) {
        // Request made but no response received
        this.logger.error(`Network Error - No response received:`);
        this.logger.error(`  URL: ${error.config?.url || 'unknown'}`);
        this.logger.error(`  Method: ${error.config?.method?.toUpperCase() || 'UNKNOWN'}`);
        this.logger.error(`  Timeout: ${error.code === 'ECONNABORTED' ? 'Yes' : 'No'}`);
        this.logger.error(`  Error Code: ${error.code || 'N/A'}`);
        this.logger.error(`  Error Message: ${error.message}`);
        
        throw new Error(`Network error: No response from main server. ${error.message}`);
      } else {
        // Error setting up request
        this.logger.error(`Request Setup Error:`);
        this.logger.error(`  Message: ${error.message}`);
        this.logger.error(`  Stack: ${error.stack}`);
        
        throw new Error(`Failed to setup SSO exchange request: ${error.message}`);
      }
    }
  }

  /**
   * Check if current token is valid
   */
  async checkAuth(): Promise<boolean> {
    const token = this.mainServerClient.getToken();
    if (!token) {
      return false;
    }

    try {
      // Try to get user profile to validate token
      await this.mainServerClient.getUserProfile();
      return true;
    } catch (error) {
      this.logger.warn('Token validation failed');
      return false;
    }
  }

  /**
   * Set service token (for backend-to-backend communication)
   */
  setServiceToken(token: string): void {
    this.mainServerClient.setToken(token);
    this.logger.log('Service token set via AuthService');
  }

  /**
   * Clear service token
   */
  clearToken(): void {
    this.mainServerClient.clearToken();
    this.logger.log('Service token cleared');
  }
}
