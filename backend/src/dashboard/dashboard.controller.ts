import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('projected-balance')
  @ApiOperation({ summary: 'Obter saldo projetado (atual + receitas futuras - despesas futuras)' })
  @ApiResponse({ status: 200, description: 'Saldo projetado retornado com sucesso' })
  getProjectedBalance(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getProjectedBalance(user.id);
  }
}

