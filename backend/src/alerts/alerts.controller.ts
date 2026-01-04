import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { AlertGeneratorService } from './alert-generator.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Alertas')
@ApiBearerAuth()
@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly alertGeneratorService: AlertGeneratorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo alerta' })
  @ApiResponse({ status: 201, description: 'Alerta criado com sucesso' })
  create(@CurrentUser() user: { id: string }, @Body() createAlertDto: CreateAlertDto) {
    return this.alertsService.create(user.id, createAlertDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os alertas do usuário' })
  @ApiQuery({ name: 'isRead', type: Boolean, required: false, description: 'Filtrar por lidos/não lidos' })
  @ApiResponse({ status: 200, description: 'Lista de alertas' })
  findAll(@CurrentUser() user: { id: string }, @Query('isRead') isRead?: string) {
    const isReadBool = isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    return this.alertsService.findAll(user.id, isReadBool);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Obter contagem de alertas não lidos' })
  @ApiResponse({ status: 200, description: 'Contagem de alertas não lidos' })
  getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.alertsService.getUnreadCount(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter alerta por ID' })
  @ApiResponse({ status: 200, description: 'Alerta encontrado' })
  @ApiResponse({ status: 404, description: 'Alerta não encontrado' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.alertsService.findOne(id, user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar alerta como lido' })
  @ApiResponse({ status: 200, description: 'Alerta marcado como lido' })
  markAsRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.alertsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todos os alertas como lidos' })
  @ApiResponse({ status: 200, description: 'Todos os alertas marcados como lidos' })
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.alertsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar alerta' })
  @ApiResponse({ status: 200, description: 'Alerta deletado com sucesso' })
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.alertsService.remove(id, user.id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Gerar alertas automáticos' })
  @ApiResponse({
    status: 200,
    description: 'Alertas gerados com sucesso',
    schema: {
      type: 'object',
      properties: {
        alertsGenerated: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async generateAlerts(@CurrentUser() user: { id: string }) {
    const alertsGenerated = await this.alertGeneratorService.generateAlertsForUser(user.id);
    return {
      alertsGenerated,
      message: `${alertsGenerated} alerta(s) gerado(s) com sucesso`,
    };
  }
}

